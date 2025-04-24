const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { 
    DynamoDBDocumentClient, 
    PutCommand 
} = require("@aws-sdk/lib-dynamodb");
const TableNames = require('../backend/constants/tableNames');

const client = new DynamoDBClient({
    region: 'local',
    endpoint: 'http://localhost:8000',
    credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local'
    }
});

const docClient = DynamoDBDocumentClient.from(client);

const timestamp = new Date().toISOString();

const createRoleTable = async () => {
    const params = {
        TableName: 'RoleTable',
        KeySchema: [
            { AttributeName: 'roleId', KeyType: 'HASH' },
            { AttributeName: 'username', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'roleId', AttributeType: 'S' },
            { AttributeName: 'username', AttributeType: 'S' },
            { AttributeName: 'email', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'EmailIndex',
                KeySchema: [
                    { AttributeName: 'email', KeyType: 'HASH' }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        await client.send(new CreateTableCommand(params));
        console.log('Table created successfully');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Table already exists');
        } else {
            throw error;
        }
    }
};

const createBankingTable = async () => {
    const params = {
        TableName: TableNames.BANKING,
        KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        await client.send(new CreateTableCommand(params));
        console.log('Banking table created successfully');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Banking table already exists');
        } else {
            throw error;
        }
    }
};

const createAllocationTable = async () => {
    const params = {
        TableName: TableNames.ALLOCATION,
        KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'sk-index',
                KeySchema: [
                    { AttributeName: 'sk', KeyType: 'HASH' }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        await client.send(new CreateTableCommand(params));
        console.log('Allocation table created successfully');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Allocation table already exists');
        } else {
            throw error;
        }
    }
};

const createDefaultUsers = async () => {
    const users = [
        {
            roleId: 'ROLE-1',
            username: 'strio_admin',
            email: 'admin@strio.com',
            password: 'admin123',
            role: 'admin',
            metadata: {
                department: 'IT Administration',
                accessLevel: 'Full',
                permissions: ['read', 'write', 'delete', 'admin']
            },
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastLogin: timestamp,
            ttl: 0
        },
        {
            roleId: 'ROLE-2',
            username: 'strio_user',
            email: 'user@strio.com',
            password: 'user123',
            role: 'user',
            metadata: {
                department: 'Operations',
                accessLevel: 'Standard',
                permissions: ['read', 'write']
            },
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastLogin: timestamp,
            ttl: 0
        },
        {
            roleId: 'ROLE-3',
            username: 'strio_viewer',
            email: 'viewer@strio.com',
            password: 'viewer123',
            role: 'viewer',
            metadata: {
                department: 'Monitoring',
                accessLevel: 'Basic',
                permissions: ['read']
            },
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastLogin: timestamp,
            ttl: 0
        }
    ];

    for (const user of users) {
        try {
            await docClient.send(new PutCommand({
                TableName: 'RoleTable',
                Item: user
            }));
            console.log(`Created user: ${user.username}`);
        } catch (error) {
            console.error(`Error creating user ${user.username}:`, error);
        }
    }
};

const init = async () => {
    await createRoleTable();
    await createBankingTable();
    await createAllocationTable();
    await createDefaultUsers();
};

init()
    .then(() => console.log('Database initialized successfully'))
    .catch(console.error);