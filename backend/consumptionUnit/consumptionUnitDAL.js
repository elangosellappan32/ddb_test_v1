const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    PutCommand,
    GetCommand,
    QueryCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const logger = require('../utils/logger');
const docClient = require('../utils/db');
const TableNames = require('../constants/tableNames');

const TableName = TableNames.CONSUMPTION_UNIT;

const createConsumptionUnit = async (item) => {
    try {
        const now = new Date().toISOString();
        const newItem = {
            ...item,
            createdat: now,
            updatedat: now
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: newItem,
            ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
        }));

        return newItem;
    } catch (error) {
        logger.error('[ConsumptionUnitDAL] Create Error:', error);
        throw error;
    }
};

const getConsumptionUnit = async (pk, sk) => {
    try {
        const { Item } = await docClient.send(new GetCommand({
            TableName,
            Key: { pk, sk }
        }));
        return Item;
    } catch (error) {
        logger.error('[ConsumptionUnitDAL] Get Error:', error);
        throw error;
    }
};

const getAllConsumptionUnits = async (pk) => {
    try {
        const { Items } = await docClient.send(new QueryCommand({
            TableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
                ':pk': pk
            }
        }));
        return Items || [];
    } catch (error) {
        logger.error('[ConsumptionUnitDAL] GetAll Error:', error);
        throw error;
    }
};

const updateConsumptionUnit = async (pk, sk, updateData) => {
    try {
        const now = new Date().toISOString();
        const item = {
            ...updateData,
            updatedat: now
        };

        await docClient.send(new PutCommand({
            TableName,
            Item: item,
            ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
        }));

        return item;
    } catch (error) {
        logger.error('[ConsumptionUnitDAL] Update Error:', error);
        throw error;
    }
};

const deleteConsumptionUnit = async (pk, sk) => {
    try {
        const command = new DeleteCommand({
            TableName,
            Key: { pk, sk },
            ReturnValues: 'ALL_OLD'
        });
        
        const { Attributes } = await docClient.send(command);
        return Attributes;
    } catch (error) {
        logger.error('[ConsumptionUnitDAL] Delete Error:', error);
        throw error;
    }
};

module.exports = {
    createConsumptionUnit,
    getConsumptionUnit,
    getAllConsumptionUnits,
    updateConsumptionUnit,
    deleteConsumptionUnit
};