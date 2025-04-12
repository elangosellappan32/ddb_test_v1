const allocationDAL = require('./allocationDAL');
const logger = require('../utils/logger');

// Constants for period types
const PEAK_PERIODS = ['C2', 'C3'];
const NON_PEAK_PERIODS = ['C1', 'C4', 'C5'];

const validateAllocationData = (data) => {
    try {
        // Required fields validation
        const requiredFields = ['productionSiteName', 'consumptionSiteName'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return {
                isValid: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
        }

        // Validate numbers for c1-c5
        ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(key => {
            if (data[key] !== undefined && (isNaN(Number(data[key])) || Number(data[key]) < 0)) {
                return {
                    isValid: false,
                    error: `${key} must be a non-negative number`
                };
            }
        });

        // Transform data before validation
        const transformedData = {
            ...data,
            productionSiteName: data.productionSiteName,
            consumptionSiteName: data.consumptionSiteName,
            c1: Number(data.c1 || 0),
            c2: Number(data.c2 || 0),
            c3: Number(data.c3 || 0),
            c4: Number(data.c4 || 0),
            c5: Number(data.c5 || 0),
            version: (data.version || 0) + 1,
            status: data.status || 'ALLOCATED',
            siteType: data.siteType || 'UNIT',
            isBanking: !!data.isBanking,
            month: data.month || new Date().toISOString().slice(0, 7)
        };

        return {
            isValid: true,
            data: transformedData
        };
    } catch (error) {
        logger.error('[AllocationController] Validation Error:', error);
        return {
            isValid: false,
            error: 'Validation error occurred'
        };
    }
};

const createAllocation = async (req, res) => {
    try {
        // Check if this is a batch request
        const isBatchRequest = req.path === '/batch';
        const allocationsToCreate = isBatchRequest ? req.body : [req.body];

        const results = [];
        const errors = [];

        // Process each allocation
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

        // Return appropriate response based on results
        if (errors.length > 0 && results.length === 0) {
            // All allocations failed
            return res.status(400).json({
                success: false,
                message: 'All allocations failed',
                errors
            });
        }

        if (errors.length > 0) {
            // Some allocations succeeded, some failed
            return res.status(207).json({
                success: true,
                message: 'Some allocations were created successfully',
                data: results,
                errors
            });
        }

        // All allocations succeeded
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
        
        if (!month) {
            return res.status(400).json({
                success: false,
                message: 'Month parameter is required'
            });
        }

        const allocations = await allocationDAL.getAllocations(undefined, month);
        
        return res.json({
            success: true,
            message: 'Allocations retrieved successfully',
            data: allocations || []
        });
    } catch (error) {
        logger.error('[AllocationController] GetAll Error:', error);
        
        // Handle specific validation errors
        if (error.message.includes('Invalid month format')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month format. Expected YYYY-MM or MMYYYY'
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const getAllocationsByPeriod = async (req, res) => {
    try {
        const { period, month } = req.params;
        const allocations = await allocationDAL.getAllocationsByPeriod(undefined, period, month);
        res.json({
            success: true,
            data: allocations
        });
    } catch (error) {
        logger.error('[AllocationController] GetByPeriod Error:', error);
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

module.exports = {
    createAllocation,
    getAllocations,
    getAllocationsByPeriod,
    updateAllocation,
    deleteAllocation
};