const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    UpdateCommand,
    GetCommand
} = require('@aws-sdk/lib-dynamodb');
const TableNames = require('../constants/tableNames');
const logger = require('./logger');

const client = new DynamoDBClient({
    region: 'local',
    endpoint: 'http://localhost:8000'
});

const docClient = DynamoDBDocumentClient.from(client);

const getNextId = async (counterId) => {
    try {
        const params = {
            TableName: TableNames.COUNTERS,
            Key: { pk: counterId },
            UpdateExpression: 'SET #val = if_not_exists(#val, :start) + :increment',
            ExpressionAttributeNames: {
                '#val': 'currentValue'
            },
            ExpressionAttributeValues: {
                ':start': 0,
                ':increment': 1
            },
            ReturnValues: 'UPDATED_NEW'
        };

        const { Attributes } = await docClient.send(new UpdateCommand(params));
        return Attributes.currentValue;
    } catch (error) {
        logger.error('[CounterDAL] GetNextId Error:', error);
        throw error;
    }
};

module.exports = {
    getNextId
};