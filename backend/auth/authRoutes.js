const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const dynamoDB = new AWS.DynamoDB.DocumentClient({
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        logger.info(`Login attempt for user: ${username}`);

        const params = {
            TableName: 'RoleTable',
            Key: { username }
        };

        const result = await dynamoDB.get(params).promise();
        
        if (!result.Item || result.Item.password !== password) {
            logger.warn(`Invalid login attempt for user: ${username}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const permissions = {
            admin: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            user: ['CREATE', 'READ', 'UPDATE'],
            viewer: ['READ']
        }[result.Item.role] || ['READ'];

        const token = jwt.sign(
            {
                username,
                role: result.Item.role,
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
                role: result.Item.role,
                permissions
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;