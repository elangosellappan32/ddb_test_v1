const logger = require('../utils/logger');

const validateAllocation = (req, res, next) => {
    try {
        const allocation = req.body;
        const allocations = Array.isArray(allocation) ? allocation : [allocation];
        const errors = [];

        for (const alloc of allocations) {
            const type = (alloc.type || 'ALLOCATION').toUpperCase();
            const validationErrors = [];

            // Common required fields for all types
            const commonFields = [
                'productionSiteId',
                'siteName',
                'productionSite',
                'month'
            ];

            // Type-specific required fields
            const typeFields = {
                'ALLOCATION': ['consumptionSiteId', 'consumptionSite', 'allocated'],
                'BANKING': ['allocated'],
                'LAPSE': ['allocated']
            };

            const requiredFields = [...commonFields, ...(typeFields[type] || [])];
            const missingFields = requiredFields.filter(field => {
                const value = alloc[field];
                return value === undefined || value === null || value === '';
            });

            if (missingFields.length > 0) {
                validationErrors.push(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Validate allocation amounts
            if (alloc.allocated) {
                const periods = ['c1', 'c2', 'c3', 'c4', 'c5'];
                const invalidPeriods = periods.filter(p => {
                    const val = Number(alloc.allocated[p]);
                    return isNaN(val) || val < 0;
                });
                
                if (invalidPeriods.length > 0) {
                    validationErrors.push(`Invalid allocation amounts for periods: ${invalidPeriods.join(', ')}`);
                }

                // Convert allocated values to numbers and normalize
                periods.forEach(p => {
                    alloc.allocated[p] = Number(alloc.allocated[p]) || 0;
                });

                // Check if any period has units
                const totalUnits = Object.values(alloc.allocated).reduce((sum, val) => sum + val, 0);
                if (totalUnits === 0) {
                    validationErrors.push('At least one period must have units allocated');
                }
            }

            // Auto-generate pk and sk if not provided
            if (!alloc.pk) {
                alloc.pk = type === 'ALLOCATION' 
                    ? `${alloc.productionSiteId}_${alloc.consumptionSiteId}`
                    : `${alloc.companyId || '1'}_${alloc.productionSiteId}`;
            }
            if (!alloc.sk) {
                alloc.sk = alloc.month;
            }

            // Set defaults for banking and lapse
            if (type === 'BANKING') {
                alloc.bankingEnabled = true;
            }

            if (validationErrors.length > 0) {
                errors.push({
                    allocation: alloc,
                    errors: validationErrors
                });
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Add validated flag and metadata to request for controller
        req.validatedAllocations = allocations.map(alloc => ({
            ...alloc,
            type: (alloc.type || 'ALLOCATION').toUpperCase(),
            validated: true,
            timestamp: new Date().toISOString(),
            version: alloc.version || 1
        }));

        next();
    } catch (error) {
        logger.error('[ValidateAllocation] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Validation error occurred',
            error: error.message
        });
    }
};

module.exports = validateAllocation;