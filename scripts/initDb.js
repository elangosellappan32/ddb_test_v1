const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
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
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: 'RoleTable' }));
        console.log('RoleTable already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

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
        console.log('RoleTable created successfully');
    } catch (error) {
        console.error('Error creating RoleTable:', error);
        throw error;
    }
};

const createBankingTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.BANKING }));
        console.log('Banking table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

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
        console.error('Error creating Banking table:', error);
        throw error;
    }
};

const createAllocationTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.ALLOCATION }));
        console.log('Allocation table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

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
        console.error('Error creating Allocation table:', error);
        throw error;
    }
};

const createProductionSitesTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.PRODUCTION_SITES }));
        console.log('Production Sites table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.PRODUCTION_SITES,
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
        console.log('Production Sites table created successfully');
    } catch (error) {
        console.error('Error creating Production Sites table:', error);
        throw error;
    }
};

const createProductionUnitTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.PRODUCTION_UNIT }));
        console.log('Production Unit table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.PRODUCTION_UNIT,
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
        console.log('Production Unit table created successfully');
    } catch (error) {
        console.error('Error creating Production Unit table:', error);
        throw error;
    }
};

const createProductionChargeTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.PRODUCTION_CHARGE }));
        console.log('Production Charge table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.PRODUCTION_CHARGE,
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
        console.log('Production Charge table created successfully');
    } catch (error) {
        console.error('Error creating Production Charge table:', error);
        throw error;
    }
};

const createConsumptionSitesTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.CONSUMPTION_SITES }));
        console.log('Consumption Sites table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.CONSUMPTION_SITES,
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
        console.log('Consumption Sites table created successfully');
    } catch (error) {
        console.error('Error creating Consumption Sites table:', error);
        throw error;
    }
};

const createConsumptionUnitTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.CONSUMPTION_UNIT }));
        console.log('Consumption Unit table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.CONSUMPTION_UNIT,
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
        console.log('Consumption Unit table created successfully');
    } catch (error) {
        console.error('Error creating Consumption Unit table:', error);
        throw error;
    }
};

const createLapseTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.LAPSE }));
        console.log('Lapse table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.LAPSE,
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
        console.log('Lapse table created successfully');
    } catch (error) {
        console.error('Error creating Lapse table:', error);
        throw error;
    }
};

const createCaptiveTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: TableNames.CAPTIVE }));
        console.log('Captive table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: TableNames.CAPTIVE,
        KeySchema: [
            { AttributeName: 'generatorCompanyId', KeyType: 'HASH' },
            { AttributeName: 'shareholderCompanyId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'generatorCompanyId', AttributeType: 'N' },
            { AttributeName: 'shareholderCompanyId', AttributeType: 'N' }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        await client.send(new CreateTableCommand(params));
        console.log('Captive table created successfully');
    } catch (error) {
        console.error('Error creating Captive table:', error);
        throw error;
    }
};

const createDefaultCaptiveData = async () => {
    const captiveData = [
        {
            generatorCompanyId: 1,  // STRIO KAIZEN HITECH RESEARCH LABS PVT LTD
            shareholderCompanyId: 1,//POLYSPIN EXPORTS LTD
            effectiveFrom: '2024-01-02',
            shareholdingPercentage: 27
        },
        {
            generatorCompanyId: 1,  // STRIO KAIZEN HITECH RESEARCH LABS PVT LTD
            shareholderCompanyId: 2,//PEL TEXTILES
            effectiveFrom: '2024-01-02',
            shareholdingPercentage: 12
        },
        {
            generatorCompanyId: 1,  // STRIO KAIZEN HITECH RESEARCH LABS PVT LTD
            shareholderCompanyId: 3, // A RAMAR AND SONS
            effectiveFrom: '2024-01-02',
            shareholdingPercentage: 62
        }
    ];

    for (const data of captiveData) {
        try {
            await docClient.send(new PutCommand({
                TableName: TableNames.CAPTIVE,
                Item: data
            }));
            console.log(`Created Captive entry for Generator ${data.generatorCompanyId} and Shareholder ${data.shareholderCompanyId}`);
        } catch (error) {
            console.error(`Error creating Captive entry for Generator ${data.generatorCompanyId} and Shareholder ${data.shareholderCompanyId}:`, error);
        }
    }
};

const createCompanyTable = async () => {
    try {
        // Check if table already exists
        await client.send(new DescribeTableCommand({ TableName: 'CompanyTable' }));
        console.log('Company table already exists, skipping creation');
        return;
    } catch (error) {
        if (error.name !== 'ResourceNotFoundException') {
            throw error;
        }
    }

    const params = {
        TableName: 'CompanyTable',
        KeySchema: [
            { AttributeName: 'companyId', KeyType: 'HASH' },
            { AttributeName: 'companyName', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'companyId', AttributeType: 'N' },
            { AttributeName: 'companyName', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        await client.send(new CreateTableCommand(params));
        console.log('Company table created successfully');
    } catch (error) {
        console.error('Error creating Company table:', error);
        throw error;
    }
};

const createDefaultCompanies = async () => {
    const companies = [
        {
            companyId: 1,
            companyName: 'STRIO KAIZEN HITECH RESEARCH LABS PVT LTD',
            type: 'generator',
            address: 'Plot 42, Sipcot Industrial Complex, Hosur, Tamil Nadu 635126',
            mobile: '+91 9876543210',
            emailId: 'info@striokaizen.com',
            contactPerson: 'Rajesh Kumar',
            managingDirector: 'Dr. Anand Sharma'
        },
        {
            companyId: 2,
            companyName: 'POLYSPIN EXPORTS LTD',
            type: 'shareholder',
            address: 'Survey No. 156, GIDC Estate, Vapi, Gujarat 396195',
            mobile: '+91 8765432109', 
            emailId: 'contact@polyspinexports.com',
            contactPerson: 'Vikram Patel',
            managingDirector: 'Sanjay Gupta'
        },
        {
            companyId: 3,
            companyName: 'PEL TEXTILES',
            type: 'shareholder',
            address: 'Block A-23, Sector 7, Noida, Uttar Pradesh 201301',
            mobile: '+91 7654321098',
            emailId: 'sales@peltextiles.in',
            contactPerson: 'Priya Malhotra',
            managingDirector: 'Arun Mehta'
        },
        {
            companyId: 4,
            companyName: 'A RAMAR AND SONS',
            type: 'shareholder',
            address: 'No. 15, Mint Street, Sowcarpet, Chennai, Tamil Nadu 600079',
            mobile: '+91 9543210987',
            emailId: 'info@aramarandsons.com',
            contactPerson: 'Suresh Ramar',
            managingDirector: 'Ramesh Ramar'
        }
    ];

    for (const company of companies) {
        try {
            await docClient.send(new PutCommand({
                TableName: 'CompanyTable',
                Item: company
            }));
            console.log(`Created company: ${company.companyName}`);
        } catch (error) {
            console.error(`Error creating company ${company.companyName}:`, error);
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
    await createCompanyTable();
    await createProductionSitesTable();
    await createProductionUnitTable();
    await createProductionChargeTable();
    await createConsumptionSitesTable();
    await createConsumptionUnitTable();
    await createLapseTable();
    await createCaptiveTable();
    await createDefaultUsers();
    await createDefaultCompanies();
    await createDefaultCaptiveData();
};

init()
    .then(() => console.log('Database initialized successfully'))
    .catch(console.error);