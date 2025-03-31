const AWS = require('aws-sdk');
const TableNames = require('../constants/tableNames');
const bcrypt = require('bcryptjs');

AWS.config.update({
    region: 'local',
    endpoint: 'http://localhost:8000'
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

const createUsers = async () => {
    const tableParams = {
        TableName: TableNames.USERS,
        KeySchema: [
            { AttributeName: 'username', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'username', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        await dynamodb.createTable(tableParams).promise();
        console.log(`Created table: ${TableNames.USERS}`);

        // Default users with fixed passwords
        const users = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'user', password: 'user123', role: 'user' },
            { username: 'viewer', password: 'viewer123', role: 'viewer' }
        ];

        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            await docClient.put({
                TableName: TableNames.USERS,
                Item: {
                    username: user.username,
                    password: hashedPassword,
                    role: user.role,
                    createdAt: new Date().toISOString()
                }
            }).promise();

            console.log(`Created user: ${user.username}`);
            console.log(`Password: ${user.password}`);
            console.log('------------------------');
        }
    } catch (error) {
        if (error.code === 'ResourceInUseException') {
            console.log(`Table exists: ${TableNames.USERS}`);
        } else {
            console.error('Error:', error);
            throw error;
        }
    }
};

createUsers()
    .then(() => console.log('Setup complete'))
    .catch(console.error);