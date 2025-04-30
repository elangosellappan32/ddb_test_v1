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
const TableNames = require('../constants/tableNames');
const logger = require('../utils/logger');
const docClient = require('../utils/db');

const TableName = TableNames.BANKING;

const createBanking = async (item) => {
    try {
        const now = new Date().toISOString();
        // Get existing banking record if it exists
        const existingBanking = await getBanking(item.pk, item.sk);
        
        const bankingItem = {
            ...item,
            // Add new banking values to existing ones
            c1: (existingBanking?.c1 || 0) + Number(item.c1 || 0),
            c2: (existingBanking?.c2 || 0) + Number(item.c2 || 0),
            c3: (existingBanking?.c3 || 0) + Number(item.c3 || 0),
            c4: (existingBanking?.c4 || 0) + Number(item.c4 || 0),
            c5: (existingBanking?.c5 || 0) + Number(item.c5 || 0),
            siteName: item.siteName || '',
            createdAt: existingBanking?.createdAt || now,
            updatedAt: now,
            version: (existingBanking?.version || 0) + 1
        };

        // Calculate total banking after update
        bankingItem.totalBanking = calculateTotal(bankingItem);

        await docClient.send(new PutCommand({
            TableName,
            Item: bankingItem
        }));

        return bankingItem;
    } catch (error) {
        logger.error('[BankingDAL] Create Error:', error);
        throw error;
    }
};

const calculateTotal = (item) => {
    return ['c1', 'c2', 'c3', 'c4', 'c5']
        .reduce((sum, key) => sum + Number(item[key] || 0), 0);
};

const getBanking = async (pk, sk) => {
    try {
        const response = await docClient.send(new GetCommand({
            TableName,
            Key: { pk, sk }
        }));
        return response.Item;
    } catch (error) {
        logger.error('[BankingDAL] Get Error:', error);
        throw error;
    }
};

const queryBankingByPeriod = async (pk, sk) => {
    try {
        const response = await docClient.send(new QueryCommand({
            TableName,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
            ExpressionAttributeValues: {
                ':pk': pk,
                ':sk': sk
            }
        }));
        return response.Items || [];
    } catch (error) {
        logger.error('[BankingDAL] Query Error:', error);
        throw error;
    }
};

const updateBanking = async (pk, sk, updates) => {
    try {
        const updateExpression = [];
        const expressionAttributeValues = {
            ':updatedAt': new Date().toISOString(),
            ':inc': 1
        };
        const expressionAttributeNames = {};

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && !['pk', 'sk'].includes(key)) {
                const attrKey = `#${key}`;
                const attrValue = `:${key}`;
                updateExpression.push(`${attrKey} = ${attrValue}`);
                expressionAttributeValues[attrValue] = value;
                expressionAttributeNames[attrKey] = key;
            }
        });

        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeNames['#version'] = 'version';
        updateExpression.push('#updatedAt = :updatedAt');
        updateExpression.push('#version = #version + :inc');

        const response = await docClient.send(new UpdateCommand({
            TableName,
            Key: { pk, sk },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        }));

        return response.Attributes;
    } catch (error) {
        logger.error('[BankingDAL] Update Error:', error);
        throw error;
    }
};

const deleteBanking = async (pk, sk) => {
    try {
        await docClient.send(new DeleteCommand({
            TableName,
            Key: { pk, sk }
        }));
        return true;
    } catch (error) {
        logger.error('[BankingDAL] Delete Error:', error);
        throw error;
    }
};

const getAllBanking = async () => {
    try {
        const response = await docClient.send(new ScanCommand({
            TableName
        }));
        
        // Transform and validate the data
        const items = response.Items || [];
        return items.map(item => ({
            ...item,
            c1: Number(item.c1 || 0),
            c2: Number(item.c2 || 0),
            c3: Number(item.c3 || 0),
            c4: Number(item.c4 || 0),
            c5: Number(item.c5 || 0),
            totalBanking: Number(item.totalBanking || 0),
            siteName: item.siteName || ''
        }));
    } catch (error) {
        logger.error('[BankingDAL] GetAll Error:', error);
        throw error;
    }
};

const getYearlyBanking = async (year) => {
    try {
        const params = {
            TableName,
            FilterExpression: 'begins_with(sk, :yearPrefix)',
            ExpressionAttributeValues: {
                ':yearPrefix': year
            }
        };

        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
    } catch (error) {
        logger.error('[BankingDAL] GetYearlyBanking Error:', error);
        throw error;
    }
};

const getAprilMayData = async (year) => {
    try {
        const aprilSK = `04${year}`;
        const maySK = `05${year}`;
        
        const params = {
            TableName,
            FilterExpression: 'sk = :april OR sk = :may',
            ExpressionAttributeValues: {
                ':april': aprilSK,
                ':may': maySK
            }
        };

        const result = await docClient.send(new ScanCommand(params));
        return result.Items || [];
    } catch (error) {
        logger.error('[BankingDAL] GetAprilMayData Error:', error);
        throw error;
    }
};

module.exports = {
    createBanking,
    getBanking,
    queryBankingByPeriod,
    updateBanking,
    deleteBanking,
    getAllBanking,
    getYearlyBanking,
    getAprilMayData
};