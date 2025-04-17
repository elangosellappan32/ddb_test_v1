const logger = require('../utils/logger');

const validateAllocation = (req, res, next) => {
    try {
        const allocation = req.body;
        const allocations = Array.isArray(allocation) ? allocation : [allocation];

        for (const alloc of allocations) {
            // Required fields validation
            const requiredFields = [
                'productionSiteId', 
                'consumptionSiteId', 
                'productionSite',
                'consumptionSite',
                'allocated',
                'type',
                'month'
            ];

            const missingFields = requiredFields.filter(field => !alloc[field]);
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    invalidAllocation: alloc
                });
            }

            // Validate allocation amounts
            const allocated = alloc.allocated || {};
            if (Object.values(allocated).some(val => val < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Allocation amounts cannot be negative',
                    invalidAllocation: alloc
                });
            }

            // Banking validation
            if (alloc.type === 'Banking') {
                // Banking must be enabled for the production site
                if (!alloc.bankingEnabled) {
                    return res.status(400).json({
                        success: false,
                        message: 'Banking is only available for sites with banking enabled',
                        invalidAllocation: alloc
                    });
                }
            }

            // Version check for updates
            if (req.method === 'PUT' && alloc.version === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Version is required for updates',
                    invalidAllocation: alloc
                });
            }
        }

        next();
    } catch (error) {
        logger.error('[ValidateAllocation] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Validation error occurred'
        });
    }
};

module.exports = validateAllocation;