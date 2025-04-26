const logger = require('../utils/logger');

const bankingValidator = (req, res, next) => {
    try {
        const banking = req.body;

        // Required fields validation
        const requiredFields = [
            'productionSiteId',
            'productionSite',
            'siteName',
            'allocated',
            'month'
        ];

        const missingFields = requiredFields.filter(field => !banking[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
                invalidBanking: banking
            });
        }

        // Set banking enabled if not provided
        if (banking.bankingEnabled === undefined) {
            banking.bankingEnabled = true;
        }

        // Validate allocation amounts
        const allocated = banking.allocated || {};
        const hasAllocation = Object.values(allocated).some(val => Number(val) > 0);
        if (!hasAllocation) {
            return res.status(400).json({
                success: false,
                message: 'At least one period must have a banking amount',
                invalidBanking: banking
            });
        }

        // Check for negative values
        if (Object.values(allocated).some(val => Number(val) < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Banking amounts cannot be negative',
                invalidBanking: banking
            });
        }

        // Convert allocated values to numbers
        Object.keys(allocated).forEach(key => {
            allocated[key] = Number(allocated[key]) || 0;
        });

        // Add type and timestamp
        banking.type = 'BANKING';
        banking.timestamp = new Date().toISOString();

        // Version check for updates
        if (req.method === 'PUT' && banking.version === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Version is required for updates',
                invalidBanking: banking
            });
        }

        next();
    } catch (error) {
        logger.error('[ValidateBanking] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Validation error occurred'
        });
    }
};

module.exports = bankingValidator;