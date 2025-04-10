const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const Decimal = require('decimal.js');
const logger = require('../utils/logger');
const docClient = require('../utils/db');
const TableNames = require('../constants/tableNames');

const TableName = TableNames.CONSUMPTION_SITES;

const getLastConsumptionSiteId = async (companyId) => {
    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName,
            KeyConditionExpression: 'companyId = :companyId',
            ExpressionAttributeValues: {
                ':companyId': companyId.toString()
            }
        }));

        if (!Items || Items.length === 0) return 0;
        const lastId = Math.max(...Items.map(item => Number(item.consumptionSiteId)));
        return lastId;
    } catch (error) {
        logger.error('[ConsumptionSiteDAL] GetLastId Error:', error);
        throw error;
    }
};

const createConsumptionSite = async (item) => {
    try {
        const now = new Date().toISOString();
        const lastId = await getLastConsumptionSiteId(item.companyId || '1');
        const newId = lastId + 1;

        const newItem = {
            companyId: item.companyId || '1',
            consumptionSiteId: newId.toString(),
            name: item.name,
            location: item.location,
            type: item.type.toLowerCase(),
            annualConsumption: new Decimal(item.annualConsumption || 0).toString(),
            status: item.status || 'active',
            version: 1,
            createdat: now,
            updatedat: now,
            timetolive: 0
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: newItem,
            ConditionExpression: 'attribute_not_exists(companyId) AND attribute_not_exists(consumptionSiteId)'
        }));

        return newItem;
    } catch (error) {
        logger.error('[ConsumptionSiteDAL] Create Error:', error);
        throw error;
    }
};

const getConsumptionSite = async (companyId, consumptionSiteId) => {
    try {
        const { Item } = await docClient.send(new GetCommand({
            TableName,
            Key: { 
                companyId: companyId.toString(),
                consumptionSiteId: consumptionSiteId.toString()
            }
        }));

        if (!Item) {
            const error = new Error('Consumption site not found');
            error.statusCode = 404;
            throw error;
        }

        // Validate required fields
        if (!Item.name || !Item.type || !Item.location) {
            logger.error('[ConsumptionSiteDAL] Invalid data in database:', Item);
            const error = new Error('Invalid site data in database');
            error.statusCode = 500;
            throw error;
        }

        // Format and validate the data before returning
        return {
            companyId: Item.companyId,
            consumptionSiteId: Item.consumptionSiteId,
            name: Item.name,
            location: Item.location,
            type: Item.type.toLowerCase(),
            annualConsumption: new Decimal(Item.annualConsumption || 0).toString(),
            status: Item.status?.toLowerCase() || 'active',
            version: Number(Item.version || 1),
            timetolive: Number(Item.timetolive || 0),
            createdat: Item.createdat || new Date().toISOString(),
            updatedat: Item.updatedat || new Date().toISOString()
        };
    } catch (error) {
        logger.error('[ConsumptionSiteDAL] Get Error:', error);
        throw error;
    }
};

const updateConsumptionSite = async (companyId, consumptionSiteId, updates) => {
    try {
        const existing = await getConsumptionSite(companyId, consumptionSiteId);
        if (!existing) {
            const error = new Error('Consumption site not found');
            error.statusCode = 404;
            throw error;
        }

        if (existing.version !== updates.version) {
            const error = new Error('Version mismatch');
            error.statusCode = 409;
            throw error;
        }

        const updatedItem = {
            ...existing,
            name: updates.name || existing.name,
            location: updates.location || existing.location,
            type: updates.type ? updates.type.toLowerCase() : existing.type,
            annualConsumption: updates.annualConsumption ? 
                new Decimal(updates.annualConsumption).toString() : 
                existing.annualConsumption,
            status: updates.status || existing.status,
            version: existing.version + 1,
            updatedat: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: updatedItem,
            ConditionExpression: 'version = :expectedVersion',
            ExpressionAttributeValues: {
                ':expectedVersion': updates.version
            }
        }));

        return updatedItem;
    } catch (error) {
        logger.error('[ConsumptionSiteDAL] Update Error:', error);
        throw error;
    }
};

const deleteConsumptionSite = async (companyId, consumptionSiteId) => {
    try {
        const { Attributes } = await docClient.send(new DeleteCommand({
            TableName,
            Key: { 
                companyId: companyId.toString(),
                consumptionSiteId: consumptionSiteId.toString()
            },
            ReturnValues: 'ALL_OLD'
        }));
        return Attributes;
    } catch (error) {
        logger.error('[ConsumptionSiteDAL] Delete Error:', error);
        throw error;
    }
};

const getAllConsumptionSites = async () => {
    try {
        const { Items } = await docClient.send(new ScanCommand({
            TableName
        }));
        return Items || [];
    } catch (error) {
        logger.error('[ConsumptionSiteDAL] GetAll Error:', error);
        throw error;
    }
};

module.exports = {
    createConsumptionSite,
    getConsumptionSite,
    getAllConsumptionSites,
    updateConsumptionSite,
    deleteConsumptionSite,
    getLastConsumptionSiteId
};
