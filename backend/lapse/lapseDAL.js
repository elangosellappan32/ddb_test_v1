const { 
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const docClient = require('../utils/db');
const TableNames = require('../constants/tableNames');
const logger = require('../utils/logger');

const getAllLapse = async () => {
    try {
        const command = new ScanCommand({
            TableName: TableNames.LAPSE
        });
        const { Items } = await docClient.send(command);
        return Items || [];
    } catch (error) {
        logger.error('[LapseDAL] GetAll Error:', error);
        throw error;
    }
};

const getLapse = async (pk, sk) => {
    try {
        const command = new GetCommand({
            TableName: TableNames.LAPSE,
            Key: { pk, sk }
        });
        const { Item } = await docClient.send(command);
        return Item;
    } catch (error) {
        logger.error('[LapseDAL] Get Error:', error);
        throw error;
    }
};

const createLapse = async (item) => {
    try {
        const now = new Date().toISOString();
        const lapseItem = {
            ...item,
            createdAt: now,
            updatedAt: now,
            version: 1
        };

        await docClient.send(new PutCommand({
            TableName: TableNames.LAPSE,
            Item: lapseItem,
            ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
        }));

        return lapseItem;
    } catch (error) {
        logger.error('[LapseDAL] Create Error:', error);
        throw error;
    }
};

const updateLapse = async (pk, sk, updates) => {
    try {
        const now = new Date().toISOString();
        
        // Get current version
        const { Item: existing } = await docClient.send(new GetCommand({
            TableName: TableNames.LAPSE,
            Key: { pk, sk }
        }));

        if (!existing) {
            const error = new Error('Lapse record not found');
            error.statusCode = 404;
            throw error;
        }

        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {
            ':updatedAt': now,
            ':inc': 1,
            ':version': existing.version
        };

        // Build update expression
        Object.entries(updates).forEach(([key, value]) => {
            if (key !== 'pk' && key !== 'sk') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = value;
            }
        });

        const params = {
            TableName: TableNames.LAPSE,
            Key: { pk, sk },
            UpdateExpression: `SET ${updateExpression.join(', ')}, version = version + :inc, updatedAt = :updatedAt`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'version = :version',
            ReturnValues: 'ALL_NEW'
        };

        const { Attributes } = await docClient.send(new UpdateCommand(params));
        return Attributes;
    } catch (error) {
        logger.error('[LapseDAL] Update Error:', error);
        throw error;
    }
};

const deleteLapse = async (pk, sk) => {
    try {
        await docClient.send(new DeleteCommand({
            TableName: TableNames.LAPSE,
            Key: { pk, sk }
        }));
        return true;
    } catch (error) {
        logger.error('[LapseDAL] Delete Error:', error);
        throw error;
    }
};

module.exports = {
    getAllLapse,
    getLapse,
    createLapse,
    updateLapse,
    deleteLapse
};