const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const logger = require('../utils/logger');

const client = new DynamoDBClient({
    region: 'local',
    endpoint: 'http://localhost:8000'
});

const docClient = DynamoDBDocumentClient.from(client);

const create = async (item) => {
    try {
        const now = new Date().toISOString();
        const existing = await getItem(item.pk, item.sk);
        
        if (existing) {
            // If item exists, update it while preserving TTL
            const updatedItem = {
                ...item,
                version: existing.version + 1,
                updatedat: now,
                createdat: existing.createdat,
                timetolive: 0  // Maintain TTL at 0
            };

            await docClient.send(new PutCommand({
                TableName: 'ProductionChargeTable',
                Item: updatedItem
            }));

            return updatedItem;
        } else {
            // If item doesn't exist, create new with TTL 0
            const newItem = {
                ...item,
                version: 1,
                createdat: now,
                updatedat: now,
                timetolive: 0  // Set initial TTL to 0
            };

            await docClient.send(new PutCommand({
                TableName: 'ProductionChargeTable',
                Item: newItem
            }));

            return newItem;
        }
    } catch (error) {
        logger.error('[ProductionChargeDAL] Create Error:', error);
        throw error;
    }
};

const getItem = async (pk, sk) => {
    try {
        const { Item } = await docClient.send(new GetCommand({
            TableName: 'ProductionChargeTable',
            Key: { pk, sk }
        }));
        
        return Item;
    } catch (error) {
        logger.error('[ProductionChargeDAL] GetItem Error:', error);
        throw error;
    }
};

const updateItem = async (pk, sk, updates) => {
    try {
        const now = new Date().toISOString();
        const existing = await getItem(pk, sk);
        
        if (!existing) {
            throw new Error('Item not found');
        }

        if (existing.version !== updates.version) {
            throw new Error('Version mismatch');
        }

        const updatedItem = {
            ...existing,
            ...updates,
            pk,
            sk,
            version: existing.version + 1,
            updatedat: now,
            timetolive: 0  // Maintain TTL at 0 during updates
        };

        await docClient.send(new PutCommand({
            TableName: 'ProductionChargeTable',
            Item: updatedItem
        }));

        return updatedItem;
    } catch (error) {
        logger.error('[ProductionChargeDAL] UpdateItem Error:', error);
        throw error;
    }
};

const deleteItem = async (pk, sk) => {
    try {
        const existing = await getItem(pk, sk);
        if (!existing) {
            return null;
        }

        const { Attributes } = await docClient.send(new DeleteCommand({
            TableName: 'ProductionChargeTable',
            Key: { pk, sk },
            ReturnValues: 'ALL_OLD'
        }));

        return Attributes;
    } catch (error) {
        logger.error('[ProductionChargeDAL] DeleteItem Error:', error);
        throw error;
    }
};

const getAllProductionCharges = async () => {
    try {
        const { Items } = await docClient.send(new ScanCommand({
            TableName: 'ProductionChargeTable'
        }));
        return Items || [];
    } catch (error) {
        logger.error('[ProductionChargeDAL] GetAll Error:', error);
        throw error;
    }
};

const getProductionChargeHistory = async (companyId, productionSiteId) => {
    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: 'ProductionChargeTable',
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
                ':pk': `${companyId}_${productionSiteId}`
            }
        }));

        return Items || [];
    } catch (error) {
        logger.error('[ProductionChargeDAL] GetHistory Error:', error);
        throw error;
    }
};

module.exports = {
    create,
    getItem,
    updateItem,
    deleteItem,
    getAllProductionCharges,
    getProductionChargeHistory
};