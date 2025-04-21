const logger = require('../utils/logger');

const validateLapse = (req, res, next) => {
    try {
        const data = req.body;

        // Required fields for lapse records
        const requiredFields = ['productionSiteId', 'period', 'amount'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Validate amount is a positive number
        if (isNaN(data.amount) || data.amount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        // Validate period format (should be c1, c2, c3, c4, or c5)
        const validPeriods = ['c1', 'c2', 'c3', 'c4', 'c5'];
        if (!validPeriods.includes(data.period.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid period. Must be one of: c1, c2, c3, c4, c5'
            });
        }

        next();
    } catch (error) {
        logger.error('[ValidateLapse] Validation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Validation error occurred'
        });
    }
};

module.exports = validateLapse;