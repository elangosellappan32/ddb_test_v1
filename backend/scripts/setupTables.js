const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'local',
    ...(process.env.IS_OFFLINE && {
        endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
        credentials: {
            accessKeyId: 'local',
            secretAccessKey: 'local'
        }
    })
});

const tables = {
    ProductionSite: {
        TableName: "ProductionSiteTable",
        KeySchema: [
            { AttributeName: "companyId", KeyType: "HASH" },
            { AttributeName: "productionSiteId", KeyType: "RANGE" }
        ],
        AttributeDefinitions: [
            { AttributeName: "companyId", AttributeType: "N" },
            { AttributeName: "productionSiteId", AttributeType: "N" }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    }
};

async function setupTables() {
    try {
        // Check existing tables
        const { TableNames } = await client.send(new ListTablesCommand({}));
        console.log('Existing tables:', TableNames);

        // Create tables if they don't exist
        for (const [tableName, tableConfig] of Object.entries(tables)) {
            if (!TableNames.includes(tableName)) {
                console.log(`Creating table: ${tableName}`);
                await client.send(new CreateTableCommand(tableConfig));
                console.log(`Table ${tableName} created successfully`);
            } else {
                console.log(`Table ${tableName} already exists`);
            }
        }

        return true;
    } catch (error) {
        console.error('Error setting up tables:', error);
        throw error;
    }
}

module.exports = setupTables;