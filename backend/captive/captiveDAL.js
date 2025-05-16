const { 
    DynamoDBDocumentClient, 
    GetCommand,
    QueryCommand,
    ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const TableNames = require('../constants/tableNames');
const logger = require('../utils/logger');
const docClient = require('../utils/db');

const TableName = TableNames.CAPTIVE;

const getCaptive = async (generatorCompanyId, shareholderCompanyId) => {
    try {
        const { Item } = await docClient.send(new GetCommand({
            TableName,
            Key: {
                generatorCompanyId: Number(generatorCompanyId),
                shareholderCompanyId: Number(shareholderCompanyId)
            }
        }));
        return Item;
    } catch (error) {
        logger.error('Error in getCaptive:', error);
        throw error;
    }
};

const getCaptivesByGenerator = async (generatorCompanyId) => {
    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName,
            KeyConditionExpression: 'generatorCompanyId = :generatorId',
            ExpressionAttributeValues: {
                ':generatorId': Number(generatorCompanyId)
            }
        }));
        return Items || [];
    } catch (error) {
        logger.error('Error in getCaptivesByGenerator:', error);
        throw error;
    }
};

const getCaptivesByShareholder = async (shareholderCompanyId) => {
    try {
        // Since we don't have a GSI, we need to scan the table
        const { Items } = await docClient.send(new ScanCommand({
            TableName,
            FilterExpression: 'shareholderCompanyId = :shareholderId',
            ExpressionAttributeValues: {
                ':shareholderId': Number(shareholderCompanyId)
            }
        }));
        return Items || [];
    } catch (error) {
        logger.error('Error in getCaptivesByShareholder:', error);
        throw error;
    }
};

const getAllCaptives = async () => {
    try {
        const { Items } = await docClient.send(new ScanCommand({
            TableName
        }));
        return Items || [];
    } catch (error) {
        logger.error('Error in getAllCaptives:', error);
        throw error;
    }
};

module.exports = {
    getCaptive,
    getCaptivesByGenerator,
    getCaptivesByShareholder,
    getAllCaptives
};
