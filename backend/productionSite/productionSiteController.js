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
    // Convert undefined/null to 0
    if (value === undefined || value === null) {
        return { isValid: true, value: 0 }; // Default to 0 instead of error
    }

    // Convert to number
    const banking = Number(value);
    
    // Validate it's 0 or 1
    if (isNaN(banking) || (banking !== 0 && banking !== 1)) {
        return { isValid: false, error: 'Banking must be 0 (No) or 1 (Yes)' };
    }

    return { isValid: true, value: banking };
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

        const result = await productionSiteDAL.deleteItem(companyId, productionSiteId);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Production site not found',
                code: 'NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: 'Production site deleted successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionSiteController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete production site',
            error: error.message,
            code: 'DELETE_ERROR'
        });
    }
};

const getAllProductionSites = async (req, res) => {
    try {
        logger.info('[ProductionSiteController] Fetching all production sites');

        // Simple scan without projection to avoid reserved keyword issues
        const params = {
            TableName: TableNames.PRODUCTION_SITES
        };

        const result = await dynamoDB.scan(params);
        logger.info(`[ProductionSiteController] Successfully fetched ${result.Items.length} sites`);

        res.json(result.Items);

    } catch (error) {
        logger.error('[ProductionSiteController] Error fetching production sites:', error);
        res.status(500).json({
            error: 'Failed to fetch production sites'
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