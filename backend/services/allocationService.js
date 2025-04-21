const logger = require('../utils/logger');
const allocationCalculator = require('./allocationCalculatorService');
const notificationService = require('./notificationService');
const ValidationUtil = require('../utils/validation');
const { ValidationError, DatabaseError } = require('../utils/errors');
const AllocationDAL = require('../allocation/allocationDAL');
const BankingDAL = require('../banking/bankingDAL');
const LapseDAL = require('../lapse/lapseDAL');

class AllocationService {
    static instance = null;

    constructor() {
        this.allocationDAL = new AllocationDAL();
        this.bankingDAL = new BankingDAL();
        this.lapseDAL = new LapseDAL();
        this.pendingTransactions = new Map();
        this.lockTimeout = 30000; // 30 seconds
    }

    static getInstance() {
        if (!AllocationService.instance) {
            AllocationService.instance = new AllocationService();
        }
        return AllocationService.instance;
    }

    async createAllocation(allocationData) {
        const timer = logger.startTimer();
        let transactionId = null;

        try {
            // Validate input data
            ValidationUtil.validateAllocationData(allocationData);
            
            // Generate transaction ID and acquire lock
            transactionId = this.generateTransactionId();
            await this.acquireLock(allocationData.productionSiteId, transactionId);

            // Calculate allocation
            const calculationResult = allocationCalculator.calculateAllocation(
                allocationData.productionAmount,
                allocationData.consumptionAmount,
                { minThreshold: allocationData.minThreshold }
            );

            // Check banking limits if there's excess production
            if (calculationResult.productionRemainder > 0) {
                const bankingResult = await this.handleExcessProduction(
                    allocationData.productionSiteId,
                    calculationResult.productionRemainder
                );
                calculationResult.bankingDetails = bankingResult;
            }

            // Create allocation record
            const allocation = await this.allocationDAL.create({
                ...allocationData,
                ...calculationResult,
                transactionId,
                status: 'COMPLETED'
            });

            // Update banking if necessary
            if (calculationResult.bankingDetails) {
                await this.bankingDAL.create({
                    siteId: allocationData.productionSiteId,
                    amount: calculationResult.bankingDetails.bankableAmount,
                    type: 'credit',
                    date: allocationData.date,
                    transactionId,
                    allocationId: allocation.id
                });
            }

            // Create lapse record if necessary
            if (calculationResult.bankingDetails?.lapseAmount > 0) {
                await this.lapseDAL.create({
                    siteId: allocationData.productionSiteId,
                    amount: calculationResult.bankingDetails.lapseAmount,
                    date: allocationData.date,
                    reason: 'Banking limit exceeded',
                    transactionId,
                    allocationId: allocation.id
                });
            }

            // Notify clients
            await notificationService.emit('allocation.created', allocation);

            timer.end('Allocation Created', {
                allocationId: allocation.id,
                transactionId
            });

            return allocation;

        } catch (error) {
            logger.error('Allocation Creation Failed', {
                error: error.message,
                stack: error.stack,
                transactionId,
                data: allocationData
            });

            if (transactionId) {
                await this.rollbackTransaction(transactionId);
            }

            throw error;
        } finally {
            if (transactionId) {
                await this.releaseLock(allocationData.productionSiteId, transactionId);
            }
        }
    }

    async handleExcessProduction(siteId, excessAmount) {
        try {
            // Get current banking status
            const currentBanking = await this.bankingDAL.getCurrentBanking(siteId);
            const bankingLimit = await this.bankingDAL.getBankingLimit(siteId);

            // Calculate banking and lapse
            return allocationCalculator.calculateLapse(
                excessAmount,
                bankingLimit,
                currentBanking
            );
        } catch (error) {
            logger.error('Excess Production Handling Failed', {
                siteId,
                excessAmount,
                error: error.message
            });
            throw error;
        }
    }

    async updateAllocation(id, updateData) {
        const timer = logger.startTimer();
        let transactionId = null;

        try {
            // Validate update data
            ValidationUtil.validateId(id);
            ValidationUtil.validateAllocationData(updateData);

            // Get existing allocation
            const existingAllocation = await this.allocationDAL.get(id);
            if (!existingAllocation) {
                throw new ValidationError('Allocation not found');
            }

            // Generate transaction ID and acquire lock
            transactionId = this.generateTransactionId();
            await this.acquireLock(existingAllocation.productionSiteId, transactionId);

            // Recalculate allocation
            const calculationResult = allocationCalculator.calculateAllocation(
                updateData.productionAmount,
                updateData.consumptionAmount,
                { minThreshold: updateData.minThreshold }
            );

            // Handle banking changes
            if (calculationResult.productionRemainder !== existingAllocation.productionRemainder) {
                await this.handleBankingUpdate(
                    existingAllocation,
                    calculationResult,
                    transactionId
                );
            }

            // Update allocation record
            const updatedAllocation = await this.allocationDAL.update(id, {
                ...updateData,
                ...calculationResult,
                transactionId,
                version: existingAllocation.version + 1
            });

            // Notify clients
            await notificationService.emit('allocation.updated', updatedAllocation);

            timer.end('Allocation Updated', {
                allocationId: id,
                transactionId
            });

            return updatedAllocation;

        } catch (error) {
            logger.error('Allocation Update Failed', {
                error: error.message,
                stack: error.stack,
                allocationId: id,
                transactionId
            });

            if (transactionId) {
                await this.rollbackTransaction(transactionId);
            }

            throw error;
        } finally {
            if (transactionId) {
                await this.releaseLock(updateData.productionSiteId, transactionId);
            }
        }
    }

    async deleteAllocation(id) {
        const timer = logger.startTimer();
        let transactionId = null;

        try {
            ValidationUtil.validateId(id);

            const allocation = await this.allocationDAL.get(id);
            if (!allocation) {
                throw new ValidationError('Allocation not found');
            }

            transactionId = this.generateTransactionId();
            await this.acquireLock(allocation.productionSiteId, transactionId);

            // Delete related records
            await Promise.all([
                this.bankingDAL.deleteByAllocationId(id),
                this.lapseDAL.deleteByAllocationId(id)
            ]);

            // Delete allocation
            await this.allocationDAL.delete(id);

            // Notify clients
            await notificationService.emit('allocation.deleted', { id, ...allocation });

            timer.end('Allocation Deleted', {
                allocationId: id,
                transactionId
            });

        } catch (error) {
            logger.error('Allocation Deletion Failed', {
                error: error.message,
                stack: error.stack,
                allocationId: id,
                transactionId
            });

            if (transactionId) {
                await this.rollbackTransaction(transactionId);
            }

            throw error;
        } finally {
            if (transactionId) {
                await this.releaseLock(allocation.productionSiteId, transactionId);
            }
        }
    }

    async handleBankingUpdate(existingAllocation, newCalculation, transactionId) {
        // Reverse previous banking if it exists
        if (existingAllocation.bankingDetails) {
            await this.bankingDAL.create({
                siteId: existingAllocation.productionSiteId,
                amount: -existingAllocation.bankingDetails.bankableAmount,
                type: 'debit',
                date: existingAllocation.date,
                transactionId,
                allocationId: existingAllocation.id
            });
        }

        // Create new banking record if needed
        if (newCalculation.bankingDetails?.bankableAmount > 0) {
            await this.bankingDAL.create({
                siteId: existingAllocation.productionSiteId,
                amount: newCalculation.bankingDetails.bankableAmount,
                type: 'credit',
                date: existingAllocation.date,
                transactionId,
                allocationId: existingAllocation.id
            });
        }
    }

    generateTransactionId() {
        return `tr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async acquireLock(resourceId, transactionId) {
        const lockKey = `lock:${resourceId}`;
        const currentLock = this.pendingTransactions.get(lockKey);

        if (currentLock && Date.now() - currentLock.timestamp < this.lockTimeout) {
            throw new Error('Resource is locked by another transaction');
        }

        this.pendingTransactions.set(lockKey, {
            transactionId,
            timestamp: Date.now()
        });
    }

    async releaseLock(resourceId, transactionId) {
        const lockKey = `lock:${resourceId}`;
        const currentLock = this.pendingTransactions.get(lockKey);

        if (currentLock && currentLock.transactionId === transactionId) {
            this.pendingTransactions.delete(lockKey);
        }
    }

    async rollbackTransaction(transactionId) {
        try {
            await Promise.all([
                this.allocationDAL.deleteByTransactionId(transactionId),
                this.bankingDAL.deleteByTransactionId(transactionId),
                this.lapseDAL.deleteByTransactionId(transactionId)
            ]);

            logger.info('Transaction Rolled Back', { transactionId });
        } catch (error) {
            logger.error('Transaction Rollback Failed', {
                error: error.message,
                transactionId
            });
            throw new DatabaseError('Failed to rollback transaction');
        }
    }
}

module.exports = AllocationService.getInstance();