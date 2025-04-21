const lapseDAL = require('./lapseDAL');
const logger = require('../utils/logger');

// Get all lapse records
exports.getAllLapse = async (req, res) => {
    try {
        const result = await lapseDAL.getAllLapse();
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
        const result = await lapseDAL.getLapse(pk, sk);
        
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

// Create lapse record
exports.createLapse = async (req, res) => {
    try {
        const result = await lapseDAL.createLapse(req.body);
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[LapseController] Create Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update lapse record
exports.updateLapse = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const result = await lapseDAL.updateLapse(pk, sk, req.body);
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
        await lapseDAL.deleteLapse(pk, sk);
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