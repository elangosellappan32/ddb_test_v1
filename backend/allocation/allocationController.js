const allocationService = require('../services/allocationService');
const logger = require('../utils/logger');

// Accept batch creation for allocations
const createAllocation = async (req, res) => {
    try {
        const isBatchRequest = Array.isArray(req.body);
        const data = isBatchRequest ? req.body : [req.body];
        const results = [];
        const errors = [];
        for (const allocation of data) {
            try {
                const result = await allocationService.createAllocation(allocation);
                results.push(result);
            } catch (error) {
                logger.error('[AllocationController] Create Error:', { error: error.message, data: allocation });
                errors.push({ data: allocation, error: error.message || 'Failed to create allocation' });
            }
        }
        if (errors.length > 0 && results.length === 0) {
            return res.status(400).json({ success: false, message: 'All allocations failed', errors });
        }
        if (errors.length > 0) {
            return res.status(207).json({ success: true, message: 'Some allocations were created successfully', data: results, errors });
        }
        res.status(201).json({ success: true, message: isBatchRequest ? 'All allocations created successfully' : 'Allocation created successfully', data: isBatchRequest ? results : results[0] });
    } catch (error) {
        logger.error('[AllocationController] Create Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

const getAllocations = async (req, res) => {
    try {
        const { month } = req.params;
        const { type } = req.query;

        // Validate month format (MMYYYY)
        if (!month?.match(/^(0[1-9]|1[0-2])\d{4}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month format. Expected format: MMYYYY (e.g., 042025)'
            });
        }

        const allocations = await allocationService.getAllocations(month, type);
        const summary = allocationService.calculateAllocationSummary(allocations);

        res.json({
            success: true,
            message: 'Allocations retrieved successfully',
            data: allocations,
            summary
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
        const result = await allocationService.updateAllocation(pk, sk, req.body);
        
        res.json({
            success: true,
            message: 'Allocation updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('[AllocationController] Update Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const deleteAllocation = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        await allocationService.deleteAllocation(pk, sk);
        
        res.json({
            success: true,
            message: 'Allocation deleted successfully'
        });
    } catch (error) {
        logger.error('[AllocationController] Delete Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

module.exports = {
    createAllocation,
    getAllocations,
    updateAllocation,
    deleteAllocation
};