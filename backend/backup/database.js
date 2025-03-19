const AWS = require('aws-sdk');

// Configure AWS SDK for DynamoDB Local
const dynamoDBConfig = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
    accessKeyId: 'local',
    secretAccessKey: 'local'
};

AWS.config.update(dynamoDBConfig);

// Create DynamoDB document client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Test database connection
const testConnection = async () => {
    try {
        // List tables to test connection
        const ddb = new AWS.DynamoDB(dynamoDBConfig);
        await ddb.listTables({}).promise();
        return true;
    } catch (error) {
        console.error('DynamoDB Local connection test failed:', error);
        return false;
    }
};

module.exports = {
    dynamoDB,
    testConnection
};