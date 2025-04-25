const lapseService = require('../services/lapseService');
const logger = require('../utils/logger');

// Get all lapse records
exports.getAllLapse = async (req, res) => {
    try {
        const { month } = req.query;
        const result = await lapseService.getLapsesByMonth(month);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[LapseController] GetAll Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get specific lapse record
exports.getLapse = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const result = await lapseService.getLapsesByProductionSite(pk, sk);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Lapse record not found'
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[LapseController] Get Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Accept batch creation for lapse
exports.createLapse = async (req, res) => {
    try {
        const isBatchRequest = Array.isArray(req.body);
        const data = isBatchRequest ? req.body : [req.body];
        const results = [];
        const errors = [];
        for (const lapse of data) {
            try {
                const result = await lapseService.create(lapse);
                results.push(result);
            } catch (error) {
                logger.error('[LapseController] Create Error:', { error: error.message, data: lapse });
                errors.push({ data: lapse, error: error.message || 'Failed to create lapse' });
            }
        }
        if (errors.length > 0 && results.length === 0) {
            return res.status(400).json({ success: false, message: 'All lapse creation failed', errors });
        }
        if (errors.length > 0) {
            return res.status(207).json({ success: true, message: 'Some lapse records created successfully', data: results, errors });
        }
        res.status(201).json({ success: true, message: isBatchRequest ? 'All lapse records created successfully' : 'Lapse record created successfully', data: isBatchRequest ? results : results[0] });
    } catch (error) {
        logger.error('[LapseController] Create Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Update lapse record
exports.updateLapse = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const result = await lapseService.update(pk, sk, req.body);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[LapseController] Update Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Delete lapse record
exports.deleteLapse = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        await lapseService.delete(pk, sk);
        res.json({
            success: true,
            message: 'Lapse record deleted successfully'
        });
    } catch (error) {
        logger.error('[LapseController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};