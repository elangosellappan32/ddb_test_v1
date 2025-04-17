const allocationDAL = require('./allocationDAL');
const productionUnitDAL = require('../productionUnit/productionUnitDAL');
const consumptionUnitDAL = require('../consumptionUnit/consumptionUnitDAL');
const logger = require('../utils/logger');

const validateAllocationData = (data) => {
    try {
        const requiredFields = [
            'productionSiteId', 
            'consumptionSiteId', 
            'fromPeriod',
            'toPeriod',
            'amount'
        ];
        
        const missingFields = requiredFields.filter(field => !data[field]);
        if (missingFields.length > 0) {
            return {
                isValid: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
        }

        // Additional validation for banking and lapse allocations
        if (data.type === 'Banking' || data.type === 'Lapse') {
            if (data.fromPeriod !== data.toPeriod) {
                return {
                    isValid: false,
                    error: `${data.type} allocations must use same period for source and destination`
                };
            }
        }

        // Validate peak/non-peak rules
        const isPeakSource = data.fromPeriod === 'c3' || data.fromPeriod === 'c4';
        const isPeakDest = data.toPeriod === 'c3' || data.toPeriod === 'c4';
        
        if (!isPeakSource && isPeakDest) {
            return {
                isValid: false,
                error: 'Cannot allocate non-peak period units to peak periods'
            };
        }

        return {
            isValid: true,
            data: {
                ...data,
                version: (data.version || 0) + 1,
                status: data.status || 'ALLOCATED',
                isBanking: data.type === 'Banking',
                isLapse: data.type === 'Lapse',
                month: data.month || new Date().toISOString().slice(0, 7),
                lastUpdated: new Date().toISOString()
            }
        };
    } catch (error) {
        logger.error('[AllocationController] Validation Error:', error);
        return {
            isValid: false,
            error: 'Validation error occurred'
        };
    }
};

const processAllocation = async (productionSite, consumptionSite, allocationData) => {
    try {
        const { fromPeriod, toPeriod, amount } = allocationData;
        
        // Validate site types and banking capability
        const isBankingAllocation = 
            productionSite.type?.toLowerCase() === 'wind' && 
            productionSite.banking === 1 &&
            allocationData.type === 'Banking';

        // Get available units
        const available = await allocationDAL.getAvailableUnits(
            productionSite.productionSiteId,
            fromPeriod,
            allocationData.month
        );

        if (available < amount) {
            throw new Error(`Insufficient units available (${available} < ${amount})`);
        }

        // Create the main allocation
        const allocationItem = {
            productionSiteId: productionSite.productionSiteId,
            consumptionSiteId: consumptionSite.consumptionSiteId,
            productionSiteName: productionSite.name,
            consumptionSiteName: consumptionSite.name,
            fromPeriod,
            toPeriod,
            amount,
            month: allocationData.month,
            type: allocationData.type || 'Allocation',
            isBanking: isBankingAllocation,
            isLapse: allocationData.type === 'Lapse',
            siteType: productionSite.type,
            bankingEnabled: productionSite.banking === 1
        };

        const result = await allocationDAL.createAllocation(allocationItem);

        // Handle remaining balance for production site 1 C1 and consumption site 1 C1
        if (productionSite.productionSiteId === '1' && fromPeriod === 'c1' && 
            consumptionSite.consumptionSiteId === '1' && toPeriod === 'c1') {
            
            const remainingBalance = available - amount;
            if (remainingBalance > 0) {
                // Try banking first if available
                if (productionSite.banking === 1) {
                    const bankingAllocation = {
                        ...allocationItem,
                        type: 'Banking',
                        amount: remainingBalance,
                        isBanking: true,
                        isLapse: false,
                        consumptionSiteId: 'BANKING',
                        consumptionSiteName: 'Banking'
                    };
                    await allocationDAL.createAllocation(bankingAllocation);
                } else {
                    // Store in lapse if banking is not available
                    const lapseAllocation = {
                        ...allocationItem,
                        type: 'Lapse',
                        amount: remainingBalance,
                        isBanking: false,
                        isLapse: true,
                        consumptionSiteId: 'LAPSE',
                        consumptionSiteName: 'Lapse'
                    };
                    await allocationDAL.createAllocation(lapseAllocation);
                }
            }
        }

        return result;
    } catch (error) {
        logger.error('[AllocationController] Process Allocation Error:', error);
        throw error;
    }
};

const createAllocation = async (req, res) => {
    try {
        const isBatchRequest = req.path === '/batch';
        const allocationsToCreate = isBatchRequest ? req.body : [req.body];

        const results = [];
        const errors = [];

        for (const allocation of allocationsToCreate) {
            const validation = validateAllocationData(allocation);
            if (!validation.isValid) {
                errors.push({
                    data: allocation,
                    error: validation.error
                });
                continue;
            }

            try {
                const result = await allocationDAL.createAllocation(validation.data);
                results.push(result);
            } catch (error) {
                errors.push({
                    data: allocation,
                    error: error.message
                });
            }
        }

        if (errors.length > 0 && results.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All allocations failed',
                errors
            });
        }

        if (errors.length > 0) {
            return res.status(207).json({
                success: true,
                message: 'Some allocations were created successfully',
                data: results,
                errors
            });
        }

        res.status(201).json({
            success: true,
            message: isBatchRequest ? 'All allocations created successfully' : 'Allocation created successfully',
            data: isBatchRequest ? results : results[0]
        });
    } catch (error) {
        logger.error('[AllocationController] Create Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const getAllocations = async (req, res) => {
    try {
        const { month } = req.params;
        const { type, isBanking } = req.query;
        
        if (!month) {
            return res.status(400).json({
                success: false,
                message: 'Month parameter is required'
            });
        }

        const filterBy = {};
        if (type) filterBy.type = type;
        if (isBanking !== undefined) filterBy.isBanking = isBanking === 'true';

        const allocations = await allocationDAL.getAllocations(month, filterBy);
        
        res.json({
            success: true,
            message: 'Allocations retrieved successfully',
            data: allocations
        });
    } catch (error) {
        logger.error('[AllocationController] GetAll Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const updateAllocation = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const validation = validateAllocationData({ ...req.body, pk, sk });
        
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const result = await allocationDAL.updateAllocation(pk, sk, validation.data);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[AllocationController] Update Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const deleteAllocation = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        await allocationDAL.deleteAllocation(pk, sk);
        res.json({
            success: true,
            message: 'Allocation deleted successfully'
        });
    } catch (error) {
        logger.error('[AllocationController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const autoAllocate = async (req, res) => {
    try {
        const { month } = req.query;
        
        // Get all available production units
        const productionUnits = await productionUnitDAL.getAllProductionUnits();
        const consumptionUnits = await consumptionUnitDAL.getAllConsumptionUnits();

        const allocations = [];

        // Special handling for production site 1 C1
        const prodSite1 = productionUnits.find(unit => 
            unit.productionSiteId === '1' && Number(unit.c1) > 0);

        if (prodSite1) {
            const consSite1 = consumptionUnits.find(unit => 
                unit.consumptionSiteId === '1' && Number(unit.c1) > 0);

            if (consSite1) {
                // Calculate allocation amount
                const amount = Math.min(Number(prodSite1.c1), Number(consSite1.c1));
                const remainingBalance = Number(prodSite1.c1) - amount;

                // Create main allocation
                const mainAllocation = {
                    productionSiteId: '1',
                    consumptionSiteId: '1',
                    fromPeriod: 'c1',
                    toPeriod: 'c1',
                    amount,
                    type: 'Allocation',
                    month: month || new Date().toISOString().slice(0, 7)
                };
                allocations.push(mainAllocation);

                // Handle remaining balance
                if (remainingBalance > 0) {
                    if (prodSite1.banking === 1) {
                        // Store in banking
                        allocations.push({
                            productionSiteId: '1',
                            consumptionSiteId: 'BANKING',
                            fromPeriod: 'c1',
                            toPeriod: 'c1',
                            amount: remainingBalance,
                            type: 'Banking',
                            month: month || new Date().toISOString().slice(0, 7)
                        });
                    } else {
                        // Store in lapse
                        allocations.push({
                            productionSiteId: '1',
                            consumptionSiteId: 'LAPSE',
                            fromPeriod: 'c1',
                            toPeriod: 'c1',
                            amount: remainingBalance,
                            type: 'Lapse',
                            month: month || new Date().toISOString().slice(0, 7)
                        });
                    }
                }
            }
        }

        // Process other allocations here if needed
        // ...

        // Create all allocations
        const results = [];
        const errors = [];

        for (const allocation of allocations) {
            try {
                const result = await allocationDAL.createAllocation(allocation);
                results.push(result);
            } catch (error) {
                errors.push({
                    data: allocation,
                    error: error.message
                });
            }
        }

        if (errors.length > 0 && results.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All allocations failed',
                errors
            });
        }

        res.json({
            success: true,
            message: 'Auto allocation completed',
            data: results,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        logger.error('[AllocationController] AutoAllocate Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

module.exports = {
    createAllocation,
    getAllocations,
    updateAllocation,
    deleteAllocation,
    processAllocation,
    autoAllocate
};