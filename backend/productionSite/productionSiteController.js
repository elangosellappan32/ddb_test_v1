const productionSiteDAL = require('./productionSiteDAL');
const logger = require('../utils/logger');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const TableNames = require('../constants/tableNames');

const dynamoDB = DynamoDBDocument.from(new DynamoDB({
    region: process.env.AWS_REGION || 'local',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
}));

// Validation functions
const validateBanking = (value) => {
    try {
        // Convert undefined/null to 0
        if (value === undefined || value === null) {
            return { isValid: true, value: 0 }; // Default to 0 instead of error
        }

        // Convert to number
        const banking = Number(value);

        // Check if it's a valid number
        if (isNaN(banking)) {
            logger.error('Invalid banking value:', value);
            return { isValid: false, error: 'Banking must be a number' };
        }

        return { isValid: true, value: banking };
    } catch (error) {
        logger.error('Banking validation error:', error);
        return { isValid: false, error: 'Banking validation failed' };
    }
};

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
        'type',
        'capacity_MW',
        'injectionVoltage_KV'
        // Remove banking from required fields
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
const createProductionSite = async (req, res) => {
    try {
        logger.info('[REQUEST] Create Production Site');
        logger.info('[REQUEST BODY]', req.body);

        // Validate required fields
        const fieldsValidation = validateRequiredFields(req.body);
        if (!fieldsValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: fieldsValidation.error,
                code: fieldsValidation.code
            });
        }

        // Validate banking
        const bankingValidation = validateBanking(req.body.banking);
        if (!bankingValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: bankingValidation.error,
                code: 'INVALID_BANKING'
            });
        }

        // Validate decimal fields
        const decimalFields = {
            capacity_MW: 'Capacity (MW)',
            annualProduction_L: 'Annual Production (L)',
            htscNo: 'HTSC Number',
            injectionVoltage_KV: 'Injection Voltage (KV)'
        };

        for (const [field, label] of Object.entries(decimalFields)) {
            const validation = validateDecimal(req.body[field], label);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error,
                    code: `INVALID_${field.toUpperCase()}`
                });
            }
            req.body[field] = validation.value;
        }

        // Update validated values
        req.body.banking = bankingValidation.value.toString();

        const result = await productionSiteDAL.create(req.body);
        logger.info('[RESPONSE] Production Site Created:', result);
        
        res.status(201).json({
            success: true,
            message: 'Production site created successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionSiteController] Create Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create production site',
            error: error.message,
            code: 'CREATE_ERROR'
        });
    }
};

const updateProductionSite = async (req, res) => {
    try {
        const { companyId, productionSiteId } = req.params;
        
        // Normalize the request body
        const updates = { ...req.body };

        // Handle both annualProduction and annualProduction_L
        if (updates.annualProduction && !updates.annualProduction_L) {
            updates.annualProduction_L = updates.annualProduction;
            delete updates.annualProduction;
        }

        // Validate banking when status is changing
        if (updates.status === 'Inactive' || updates.status === 'Maintenance') {
            updates.banking = 0;
        }

        // Validate decimal fields
        const decimalFields = {
            capacity_MW: 'Capacity (MW)',
            annualProduction_L: 'Annual Production (L)',
            htscNo: 'HTSC Number',
            injectionVoltage_KV: 'Injection Voltage (KV)'
        };

        for (const [field, label] of Object.entries(decimalFields)) {
            if (updates[field] !== undefined) {
                const validation = validateDecimal(updates[field], label);
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.error
                    });
                }
                updates[field] = validation.value;
            }
        }

        const updatedItem = await productionSiteDAL.updateItem(
            companyId,
            productionSiteId,
            updates
        );
        
        res.json({
            success: true,
            data: updatedItem
        });
    } catch (error) {
        logger.error('[ProductionSiteController] Update Error:', error);
        const statusCode = error.message.includes('Version mismatch') ? 409 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// GET, DELETE, and GET ALL operations
const getProductionSite = async (req, res) => {
    try {
        const { companyId, productionSiteId } = req.params;
        logger.info(`[REQUEST] Get Production Site ${productionSiteId}`);

        const result = await productionSiteDAL.getItem(companyId, productionSiteId);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Production site not found',
                code: 'NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: 'Production site retrieved successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionSiteController] Get Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve production site',
            error: error.message,
            code: 'GET_ERROR'
        });
    }
};

const deleteProductionSite = async (req, res) => {
    try {
        const { companyId, productionSiteId } = req.params;
        logger.info(`[REQUEST] Delete Production Site ${productionSiteId}`);

        // Check for authenticated user
        if (!req.user) {
            logger.error('[ProductionSiteController] No authenticated user');
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }        // Check if user has DELETE permission for production
        if (!req.user.permissions) {
            logger.error('[ProductionSiteController] User permissions not configured');
            return res.status(403).json({
                success: false,
                message: 'User permissions not properly configured',
                code: 'INVALID_PERMISSIONS'
            });
        }

        const canDelete = req.user.permissions.production?.includes('DELETE');
        if (!canDelete) {
            logger.error('[ProductionSiteController] User lacks DELETE permission:', req.user.permissions);
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete sites',
                code: 'DELETE_NOT_ALLOWED'
            });
        }

        // Input validation
        if (!companyId || !productionSiteId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID and Production Site ID are required',
                code: 'INVALID_INPUT'
            });
        }

        // Check if site exists and is accessible
        let existingSite;
        try {
            existingSite = await productionSiteDAL.getItem(companyId, productionSiteId);
        } catch (error) {
            logger.error('[ProductionSiteController] Error checking site existence:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking site existence',
                code: 'DATABASE_ERROR'
            });
        }

        if (!existingSite) {
            return res.status(404).json({
                success: false,
                message: 'Production site not found',
                code: 'NOT_FOUND'
            });
        }

        // If user has restricted site access, validate they can access this site
        if (req.user?.accessibleSites?.productionSites) {
            const accessibleSiteIds = req.user.accessibleSites.productionSites.L.map(site => site.S);
            const siteId = `${companyId}_${productionSiteId}`;
            if (!accessibleSiteIds.includes(siteId)) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this site',
                    code: 'ACCESS_DENIED'
                });
            }
        }

        // Proceed with deletion and cleanup
        let result;
        try {
            result = await productionSiteDAL.deleteItem(companyId, productionSiteId);
        } catch (error) {
            logger.error('[ProductionSiteController] Error during site deletion:', error);
            
            if (error.code === 'ConditionalCheckFailedException') {
                return res.status(409).json({
                    success: false,
                    message: 'Site has been modified by another user',
                    code: 'CONFLICT'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to delete production site',
                code: 'DELETE_ERROR',
                error: error.message
            });
        }

        if (!result) {
            logger.error('[ProductionSiteController] Deletion returned no result');
            return res.status(500).json({
                success: false,
                message: 'Deletion failed - no result returned',
                code: 'DELETE_ERROR'
            });
        }

        // Log the successful deletion with cleanup details
        logger.info('[SUCCESS] Site deletion completed:', {
            siteId: productionSiteId,
            cleanupStats: result.relatedDataCleanup
        });

        return res.json({
            success: true,
            message: 'Production site deleted successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionSiteController] Unexpected error during deletion:', error);
        
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while deleting the production site',
            error: error.message,
            code: 'UNEXPECTED_ERROR'
        });
    }
};

const getAllProductionSites = async (req, res) => {
    try {
        // Get all production sites
        let items = await productionSiteDAL.getAllProductionSites();
        
        // Filter items based on user's accessible sites
        if (req.user && req.user.accessibleSites) {
            const accessibleSiteIds = req.user.accessibleSites.productionSites.L.map(site => site.S);
            items = items.filter(item => {
                const siteId = `${item.companyId}_${item.productionSiteId}`;
                return accessibleSiteIds.includes(siteId);
            });
        }

        // Return filtered results
        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        logger.error('[ProductionSiteController] Error fetching production sites:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch production sites',
            error: error.message
        });
    }
};

// Export all functions together
module.exports = {
    createProductionSite,
    getProductionSite,
    updateProductionSite,
    deleteProductionSite,
    getAllProductionSites
};