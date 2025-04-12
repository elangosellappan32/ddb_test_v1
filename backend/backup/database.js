const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// DynamoDB Local Configuration
const client = new DynamoDBClient({
    region: 'local',
    endpoint: 'http://localhost:8000',
    credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local'
    }
});

// Create DynamoDB document client
const docClient = DynamoDBDocumentClient.from(client);

// Test database connection
const testConnection = async () => {
    try {
        // List tables to test connection
        const command = new ListTablesCommand({});
        await client.send(command);
        return true;
    } catch (error) {
        console.error('DynamoDB Local connection test failed:', error);
        return false;
    }
};

module.exports = {
    docClient,
    client,
    testConnection
};