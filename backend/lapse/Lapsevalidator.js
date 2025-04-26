const logger = require('../utils/logger');
const { ALL_PERIODS } = require('../constants/periods');

const validateLapse = (req, res, next) => {
    try {
        const data = req.body;
        const errors = [];

        // Required fields
        const requiredFields = ['companyId', 'productionSiteId', 'siteName', 'allocated'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Normalize allocated values - ensure all periods exist
        if (data.allocated) {
            const normalizedAllocated = {};
            ALL_PERIODS.forEach(period => {
                normalizedAllocated[period] = Number(data.allocated[period] || 0);
                // Validate each period's value
                if (isNaN(normalizedAllocated[period]) || normalizedAllocated[period] < 0) {
                    errors.push(`Invalid value for period ${period}`);
                }
            });
            data.allocated = normalizedAllocated;
        }

        // Ensure at least one period has an allocation
        const hasAllocation = Object.values(data.allocated || {})
            .some(value => value > 0);

        if (!hasAllocation) {
            errors.push('At least one period must have a lapse amount');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Add normalized data back to request
        req.body = data;
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