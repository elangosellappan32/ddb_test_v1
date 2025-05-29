const consumptionSiteDAL = require('./consumptionSiteDAL');
const logger = require('../utils/logger');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const TableNames = require('../constants/tableNames');

const dynamoDB = DynamoDBDocument.from(new DynamoDB({
    region: process.env.AWS_REGION || 'local',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
}));

const validateDecimal = (value, fieldName) => {
    if (value === undefined || value === null) {
        return { isValid: false, error: `${fieldName} is required` };
    }

    const number = parseFloat(value);
    if (isNaN(number) || number < 0) {
        return { isValid: false, error: `${fieldName} must be a valid positive number` };
    }

    return { isValid: true, value: number.toFixed(2) };
};

// Update validateRequiredFields to remove banking from required fields
const validateRequiredFields = (data) => {
    const requiredFields = [
        'companyId',
        'name',
        'location',
        'type'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
        return {
            isValid: false,
            error: `Missing required fields: ${missingFields.join(', ')}`,
            code: 'MISSING_FIELDS'
        };
    }

    return { isValid: true };
};

// CRUD Operations
const getAllConsumptionSites = async (req, res) => {
    try {
        let items = await consumptionSiteDAL.getAllConsumptionSites();

        // Filter items based on user's accessible sites
        if (req.user && req.user.accessibleSites) {
            const accessibleSiteIds = req.user.accessibleSites.consumptionSites.L.map(site => site.S);
            items = items.filter(item => {
                const siteId = `${item.companyId}_${item.consumptionSiteId}`;
                return accessibleSiteIds.includes(siteId);
            });
        }

        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        logger.error('[ConsumptionSiteController] GetAll Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getConsumptionSite = async (req, res) => {
    try {
        const { companyId, consumptionSiteId } = req.params;
        const item = await consumptionSiteDAL.getConsumptionSite(companyId, consumptionSiteId);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Consumption site not found'
            });
        }

        // Additional validation at controller level
        if (!item.name || !item.type || !item.location) {
            return res.status(500).json({
                success: false,
                message: 'Invalid site data structure'
            });
        }

        res.json({
            success: true,
            data: {
                ...item,
                type: item.type.toLowerCase(),
                status: item.status?.toLowerCase() || 'active',
                version: Number(item.version || 1),
                timetolive: Number(item.timetolive || 0),
                annualConsumption: Number(item.annualConsumption || 0),
                createdat: item.createdat || new Date().toISOString(),
                updatedat: item.updatedat || new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('[ConsumptionSiteController] Get Error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

const createConsumptionSite = async (req, res) => {
    try {
        const newItem = await consumptionSiteDAL.createConsumptionSite(req.body);
        res.status(201).json({
            success: true,
            data: newItem
        });
    } catch (error) {
        logger.error('[ConsumptionSiteController] Create Error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateConsumptionSite = async (req, res) => {
    try {
        const { companyId, consumptionSiteId } = req.params;
        const updatedItem = await consumptionSiteDAL.updateConsumptionSite(
            companyId,
            consumptionSiteId,
            req.body
        );
        
        res.json({
            success: true,
            data: updatedItem
        });
    } catch (error) {
        logger.error('[ConsumptionSiteController] Update Error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

const deleteConsumptionSite = async (req, res) => {
    try {
        const { companyId, consumptionSiteId } = req.params;

        // Authentication check
        if (!req.user) {
            logger.error('[ConsumptionSiteController] No authenticated user');
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        // Permission check
        if (!req.user.permissions?.consumption?.includes('DELETE')) {
            logger.error('[ConsumptionSiteController] User lacks DELETE permission:', req.user.permissions);
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete sites',
                code: 'DELETE_NOT_ALLOWED'
            });
        }

        // Input validation
        if (!companyId || !consumptionSiteId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and Consumption Site ID are required',
                code: 'INVALID_INPUT'
            });
        }        // Check if user has permission to delete this site
        if (!req.user.role?.toLowerCase() === 'admin' && req.user?.accessibleSites?.consumptionSites) {
            const accessibleSiteIds = req.user.accessibleSites.consumptionSites.L.map(site => site.S);
            const siteId = `${companyId}_${consumptionSiteId}`;
            if (!accessibleSiteIds.includes(siteId)) {
                logger.error(`[ConsumptionSiteController] User ${req.user.username} attempted to delete inaccessible site ${siteId}`);
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this site',
                    code: 'ACCESS_DENIED'
                });
            }
        }        // First check if the site exists
        const existingSite = await consumptionSiteDAL.getConsumptionSite(companyId, consumptionSiteId);
        if (!existingSite) {
            logger.warn(`[ConsumptionSiteController] Attempt to delete non-existent site: ${companyId}_${consumptionSiteId}`);
            return res.status(404).json({
                success: false,
                message: 'Consumption site not found',
                code: 'NOT_FOUND'
            });
        }

        // Proceed with deletion and cleanup
        let result;
        try {
            result = await consumptionSiteDAL.deleteConsumptionSite(companyId, consumptionSiteId);
            logger.info(`[ConsumptionSiteController] Successfully deleted site: ${companyId}_${consumptionSiteId}`);
        } catch (error) {
            logger.error('[ConsumptionSiteController] Error during site deletion:', error);
            
            if (error.code === 'ConditionalCheckFailedException') {
                return res.status(409).json({
                    success: false,
                    message: 'Site has been modified by another user',
                    code: 'CONFLICT'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to delete consumption site',
                code: 'DELETE_ERROR',
                error: error.message
            });
        }

        if (!result) {
            logger.error('[ConsumptionSiteController] Deletion returned no result');
            return res.status(500).json({
                success: false,
                message: 'Deletion failed - no result returned',
                code: 'DELETE_ERROR'
            });
        }

        // Log the successful deletion with cleanup details
        logger.info('[SUCCESS] Site deletion completed:', {
            siteId: consumptionSiteId,
            cleanupStats: result.relatedDataCleanup
        });

        return res.json({
            success: true,
            message: 'Consumption site deleted successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ConsumptionSiteController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred while deleting the consumption site',
            code: 'UNEXPECTED_ERROR'
        });
    }
};

module.exports = {
    getAllConsumptionSites,
    getConsumptionSite,
    createConsumptionSite,
    updateConsumptionSite,
    deleteConsumptionSite
};