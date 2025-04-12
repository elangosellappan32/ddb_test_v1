const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

const docClient = DynamoDBDocumentClient.from(client);

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        logger.info(`Login attempt for user: ${username}`);

        const command = new ScanCommand({
            TableName: 'RoleTable',
            FilterExpression: '#username = :username',
            ExpressionAttributeNames: {
                '#username': 'username'
            },
            ExpressionAttributeValues: {
                ':username': username
            }
        });

        try {
            const result = await docClient.send(command);
            
            if (!result.Items || result.Items.length === 0) {
                logger.warn(`User not found: ${username}`);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const user = result.Items[0];
            
            if (user.password !== password) {
                logger.warn(`Invalid password for user: ${username}`);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const permissions = {
                admin: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
                user: ['CREATE', 'READ', 'UPDATE'],
                viewer: ['READ']
            }[user.role] || ['READ'];

            const token = jwt.sign(
                {
                    username,
                    role: user.role,
                    permissions
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            logger.info(`Successful login for user: ${username}`);
            res.json({
                success: true,
                token,
                user: {
                    username,
                    role: user.role,
                    permissions
                }
            });
        } catch (error) {
            logger.error('DynamoDB Error:', error);
            res.status(500).json({
                success: false,
                message: 'Database error occurred'
            });
        }
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;