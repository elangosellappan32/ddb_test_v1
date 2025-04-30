const logger = require('../utils/logger');

const bankingValidator = (req, res, next) => {
    try {
        const banking = req.body;

        // Required fields validation
        const requiredFields = ['pk', 'sk', 'allocated'];

        const missingFields = requiredFields.filter(field => banking[field] === undefined || banking[field] === null);
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

        // Convert allocated values to numbers
        if (banking.allocated && typeof banking.allocated === 'object') {
            Object.keys(banking.allocated).forEach(key => {
                banking.allocated[key] = Number(banking.allocated[key]) || 0;
            });
        }

        banking.timestamp = new Date().toISOString();

        // Version check for updates
        if (req.method === 'PUT' && banking.version === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Version is required for updates',
                invalidBanking: banking
            });
        }

        // Strip unwanted fields
        delete banking.productionSite;
        delete banking.siteType;
        delete banking.month;
        delete banking.companyId;
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