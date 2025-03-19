// productionSiteDAL.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const Decimal = require('decimal.js');
const logger = require('../utils/logger');

const docClient = require('../utils/db');
const TableName = 'ProductionSiteTable';

const getLastProductionSiteId = async (companyId) => {
    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName,
            KeyConditionExpression: 'companyId = :companyId',
            ExpressionAttributeValues: {
                ':companyId': companyId
            }
        }));

        if (!Items || Items.length === 0) {
            return 0;
        }

        const lastId = Math.max(...Items.map(item => Number(item.productionSiteId)));
        return lastId;
    } catch (error) {
        logger.error('[ProductionSiteDAL] GetLastId Error:', error);
        throw error;
    }
};

const create = async (item) => {
    try {
        const now = new Date().toISOString();
        const lastId = await getLastProductionSiteId(item.companyId);
        const newId = lastId + 1;

        const newItem = {
            companyId: item.companyId,
            productionSiteId: newId,
            name: item.name,
            location: item.location,
            type: item.type,
            banking: new Decimal(item.banking || 0).toString(),
            capacity_MW: new Decimal(item.capacity_MW || 0).toString(),
            annualProduction_L: new Decimal(item.annualProduction_L || 0).toString(),
            htscNo: new Decimal(item.htscNo || 0).toString(),
            injectionVoltage_KV: new Decimal(item.injectionVoltage_KV || 0).toString(),
            status: item.status,
            version: 1,
            createdat: now,
            updatedat: now,
            timetolive: 0
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: newItem,
            ConditionExpression: 'attribute_not_exists(companyId) AND attribute_not_exists(productionSiteId)'
        }));

        return newItem;
    } catch (error) {
        logger.error('[ProductionSiteDAL] Create Error:', error);
        throw error;
    }
};

const getItem = async (companyId, productionSiteId) => {
    try {
        const { Item } = await docClient.send(new GetCommand({
            TableName,
            Key: { 
                companyId: parseInt(companyId), 
                productionSiteId: parseInt(productionSiteId) 
            }
        }));
        
        return Item;
    } catch (error) {
        logger.error('[ProductionSiteDAL] GetItem Error:', error);
        throw error;
    }
};

const updateItem = async (companyId, productionSiteId, updates) => {
    try {
        const now = new Date().toISOString();
        const existing = await getItem(companyId, productionSiteId);
        
        if (!existing) {
            throw new Error('Item not found');
        }

        if (existing.version !== updates.version) {
            throw new Error('Version mismatch');
        }

        const updatedItem = {
            ...existing,
            name: updates.name || existing.name,
            location: updates.location || existing.location,
            type: updates.type || existing.type,
            banking: updates.banking ? new Decimal(updates.banking).toString() : existing.banking,
            capacity_MW: updates.capacity_MW ? new Decimal(updates.capacity_MW).toString() : existing.capacity_MW,
            annualProduction_L: updates.annualProduction_L ? new Decimal(updates.annualProduction_L).toString() : existing.annualProduction_L,
            htscNo: updates.htscNo ? new Decimal(updates.htscNo).toString() : existing.htscNo,
            injectionVoltage_KV: updates.injectionVoltage_KV ? new Decimal(updates.injectionVoltage_KV).toString() : existing.injectionVoltage_KV,
            status: updates.status || existing.status,
            version: existing.version + 1,
            updatedat: now
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: updatedItem
        }));

        return updatedItem;
    } catch (error) {
        logger.error('[ProductionSiteDAL] UpdateItem Error:', error);
        throw error;
    }
};

const deleteItem = async (companyId, productionSiteId) => {
    try {
        const { Attributes } = await docClient.send(new DeleteCommand({
            TableName,
            Key: { 
                companyId: parseInt(companyId), 
                productionSiteId: parseInt(productionSiteId) 
            },
            ReturnValues: 'ALL_OLD'
        }));

        return Attributes;
    } catch (error) {
        logger.error('[ProductionSiteDAL] DeleteItem Error:', error);
        throw error;
    }
};

const getAllItems = async () => {
    try {
        const { Items } = await docClient.send(new ScanCommand({
            TableName
        }));
        return Items || [];
    } catch (error) {
        logger.error('[ProductionSiteDAL] GetAll Error:', error);
        throw error;
    }
};

module.exports = {
    create,
    getItem,
    updateItem,
    deleteItem,
    getAllItems,
    getLastProductionSiteId
};
