const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
const logger = require('./logger');

const client = new DynamoDBClient({
    region: 'local',
    endpoint: 'http://localhost:8000'
});

const createTable = async (params) => {
    try {
        await client.send(new CreateTableCommand(params));
        logger.info(`Created table: ${params.TableName}`);
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            logger.info(`Table ${params.TableName} already exists`);
        } else {
            logger.error(`Error creating table ${params.TableName}:`, error);
            throw error;
        }
    }
};

const setupDatabase = async () => {
    try {
        // ProductionSiteTable
        await createTable({
            TableName: 'ProductionSiteTable',
            KeySchema: [
                { AttributeName: 'companyId', KeyType: 'HASH' },
                { AttributeName: 'productionSiteId', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'companyId', AttributeType: 'N' },
                { AttributeName: 'productionSiteId', AttributeType: 'N' }
            ],
            BillingMode: 'PROVISIONED',
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });

        // ProductionUnitTable
        await createTable({
            TableName: 'ProductionUnitTable',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'pk', AttributeType: 'S' },
                { AttributeName: 'sk', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
        });

        // ProductionChargeTable
        await createTable({
            TableName: 'ProductionChargeTable',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'pk', AttributeType: 'S' },
                { AttributeName: 'sk', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
        });

        // ConsumptionSiteTable
        await createTable({
            TableName: 'ConsumptionSiteTable',
            KeySchema: [
                { AttributeName: 'companyId', KeyType: 'HASH' },
                { AttributeName: 'consumptionSiteId', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'companyId', AttributeType: 'S' },
                { AttributeName: 'consumptionSiteId', AttributeType: 'S' }
            ],
            BillingMode: 'PROVISIONED',
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });

        // ConsumptionTable
        await createTable({
            TableName: 'ConsumptionTable',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'pk', AttributeType: 'S' },
                { AttributeName: 'sk', AttributeType: 'S' }
            ],
            BillingMode: 'PROVISIONED',
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });

        logger.info('Database setup completed successfully');
    } catch (error) {
        logger.error('Database setup failed:', error);
        throw error;
    }
};

module.exports = setupDatabase;