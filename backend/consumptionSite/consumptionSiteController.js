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
        const items = await consumptionSiteDAL.getAllConsumptionSites();
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
        const deletedItem = await consumptionSiteDAL.deleteConsumptionSite(
            companyId,
            consumptionSiteId
        );
        
        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: 'Consumption site not found'
            });
        }

        res.json({
            success: true,
            data: deletedItem
        });
    } catch (error) {
        logger.error('[ConsumptionSiteController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
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