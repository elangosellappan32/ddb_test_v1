const logger = require('../utils/logger');
const { ALL_PERIODS } = require('../constants/periods');

const validateLapse = (req, res, next) => {
    try {
        const data = req.body;
        const errors = [];

        // Required fields: productionSiteId, month, and allocated
        const requiredFields = ['productionSiteId', 'month', 'allocated'];
        const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);
        
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

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Strip unwanted fields
        delete data.siteName;
        delete data.productionSite;
        delete data.siteType;
        delete data.companyId;
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