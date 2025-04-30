const allocationDAL = require('./allocationDAL');
const bankingDAL = require('../banking/bankingDAL');
const lapseService = require('../services/lapseService');
const logger = require('../utils/logger');
const { ALL_PERIODS } = require('../constants/periods');
const ValidationError = require('../utils/errors').ValidationError;
const productionSiteDAL = require('../productionSite/productionSiteDAL');

const createAllocation = async (req, res, next) => {
    try {
        const allocations = req.validatedAllocations || [];
        if (!allocations.length) {
            return res.status(400).json({ success: false, message: 'No allocations provided' });
        }
        // Parallel upsert of all allocations
        const results = await Promise.all(
            allocations.map(alloc => allocationDAL.putItem(alloc))
        );
        return res.status(201).json({ success: true, data: results });
    } catch (error) {
        logger.error('[AllocationController] Create Error:', error);
        next(error);
    }
};

const calculateTotal = (allocation) => {
    return ALL_PERIODS.reduce((sum, key) => sum + (Number(allocation[key]) || 0), 0);
};

const getAllocations = async (req, res, next) => {
    try {
        const { month } = req.params;
        if (!month) {
            throw new ValidationError('Month parameter is required');
        }
        const allocations = await allocationDAL.getAllocations(month);
        // fetch banking and lapse records for this month
        const allBanking = await bankingDAL.getAllBanking();
        const banking = allBanking.filter(item => item.sk === month);
        const lapseRecords = await lapseService.getLapsesByMonth(month);
        res.json({ success: true, data: allocations, banking, lapse: lapseRecords });
    } catch (error) {
        logger.error('[AllocationController] GetAllocations Error:', error);
        next(error);
    }
};

const updateAllocation = async (req, res, next) => {
    try {
        const { pk, sk } = req.params;
        const allocations = req.validatedAllocations || [];
        const alloc = allocations[0];
        if (!alloc) {
            return res.status(400).json({ success: false, message: 'No allocation provided' });
        }

        const existing = await allocationDAL.getItem({ pk, sk });
        // Upsert: merge if exists, otherwise create new
        const merged = existing
            ? { ...existing, ...alloc, pk, sk }
            : { ...alloc, pk, sk };
        const result = await allocationDAL.putItem(merged);

        // Adjust banking and lapse based on allocation changes
        const [companyId, productionSiteId] = pk.split('_');
        const month = sk;
        const site = await productionSiteDAL.getItem(companyId, productionSiteId);
        if (!site) {
            return res.status(404).json({ success: false, message: 'Production site not found' });
        }
        const bankingEnabled = Number(site.banking || 0) === 1;

        let bankingRecord;
        try {
            bankingRecord = await bankingDAL.getBanking(`${companyId}_${productionSiteId}`, month);
        } catch {
            bankingRecord = null;
        }

        let existingLapse = null;
        const lapseRecords = await lapseService.getLapsesByProductionSite(productionSiteId, month, month, companyId);
        if (lapseRecords && lapseRecords.length) existingLapse = lapseRecords[0];

        for (const period of ALL_PERIODS) {
            const oldVal = Number(existing?.[period] || 0);
            const newVal = Number(alloc[period] || 0);
            const delta = newVal - oldVal;
            if (delta === 0) continue;

            if (delta > 0) {
                // Consumption increased
                if (bankingEnabled && bankingRecord) {
                    const bankOld = Number(bankingRecord[period] || 0);
                    const reduce = Math.min(bankOld, delta);
                    if (reduce > 0) {
                        await bankingDAL.updateBanking(`${companyId}_${productionSiteId}`, month, { [period]: bankOld - reduce });
                    }
                    const leftover = delta - reduce;
                    if (leftover > 0) {
                        if (existingLapse) {
                            const lapseOld = Number(existingLapse.allocated[period] || 0);
                            await lapseService.update(`${companyId}_${productionSiteId}`, month, { allocated: { [period]: lapseOld + leftover } });
                        } else {
                            await lapseService.create({ companyId, productionSiteId, month, allocated: { [period]: leftover } });
                        }
                    }
                } else {
                    // All goes to lapse when banking disabled
                    if (existingLapse) {
                        const lapseOld = Number(existingLapse.allocated[period] || 0);
                        await lapseService.update(`${companyId}_${productionSiteId}`, month, { allocated: { [period]: lapseOld + delta } });
                    } else {
                        await lapseService.create({ companyId, productionSiteId, month, allocated: { [period]: delta } });
                    }
                }
            } else {
                // Consumption decreased: free units
                const freed = -delta;
                if (bankingEnabled) {
                    const bankOld = Number(bankingRecord?.[period] || 0);
                    await bankingDAL.updateBanking(`${companyId}_${productionSiteId}`, month, { [period]: bankOld + freed });
                } else if (existingLapse) {
                    const lapseOld = Number(existingLapse.allocated[period] || 0);
                    const newLapse = Math.max(0, lapseOld - freed);
                    await lapseService.update(`${companyId}_${productionSiteId}`, month, { allocated: { [period]: newLapse } });
                }
            }
        }

        return res.json({ success: true, data: result });
    } catch (error) {
        logger.error('[AllocationController] Update Error:', error);
        next(error);
    }
};

const deleteAllocation = async (pk, sk) => {
    try {
        await allocationDAL.deleteAllocation(pk, sk);
    } catch (error) {
        logger.error('[AllocationController] Delete Error:', error);
        throw error;
    }
};

module.exports = {
    createAllocation,
    getAllocations,
    calculateTotal,
    updateAllocation,
    deleteAllocation
};