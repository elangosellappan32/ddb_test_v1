const AWS = require('aws-sdk');
const logger = require('../utils/logger');

class AuthDAL {
    constructor() {
        this.dynamoDB = new AWS.DynamoDB.DocumentClient({
            endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
        });
        this.tableName = 'RoleTable';
    }

    async getUserFromRoleTable(username) {
        try {
            const params = {
                TableName: this.tableName,
                FilterExpression: '#username = :username',
                ExpressionAttributeNames: {
                    '#username': 'username'
                },
                ExpressionAttributeValues: {
                    ':username': username
                }
            };

            const result = await this.dynamoDB.scan(params).promise();
            
            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            const user = result.Items[0];
            return {
                username: user.username,
                password: user.password,
                role: user.role,
                emailId: user.emailId,
                version: user.version
            };
        } catch (error) {
            logger.error('Get user error:', error);
            throw new Error('Database error');
        }
    }

    async getUserByUsername(username) {
        try {
            // First get the roleId for the username
            const queryParams = {
                TableName: this.tableName,
                KeyConditionExpression: 'roleId = :roleId',
                FilterExpression: 'username = :username',
                ExpressionAttributeValues: {
                    ':roleId': this.getRoleIdByUsername(username),
                    ':username': username
                }
            };

            const { Items } = await this.dynamoDB.query(queryParams).promise();
            return Items?.[0] || null;
        } catch (error) {
            logger.error('DAL Error - getUserByUsername:', error);
            throw error;
        }
    }

    getRoleIdByUsername(username) {
        switch (username) {
            case 'strio_admin':
                return 'ROLE-1';
            case 'strio_user':
                return 'ROLE-2';
            case 'strio_viewer':
                return 'ROLE-3';
            default:
                return 'ROLE-2'; // Default to user role
        }
    }

    async getUserByEmail(email) {
        const command = {
            TableName: this.tableName,
            IndexName: 'EmailIndex',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
                ':email': email
            }
        };

        try {
            const response = await this.dynamoDB.query(command).promise();
            return response.Items[0];
        } catch (error) {
            logger.error('DAL Error - getUserByEmail:', error);
            throw error;
        }
    }

    async createUser(userData) {
        if (!userData.username || !userData.password || !userData.role) {
            throw new Error('Username, password and role are required');
        }

        const timestamp = new Date().toISOString();
        const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

        const command = {
            TableName: this.tableName,
            Item: {
                username: userData.username,
                email: userData.email,
                password: userData.password,
                role: userData.role || 'user',
                metadata: userData.metadata || {
                    department: 'General',
                    accessLevel: 'Basic',
                    permissions: ['read']
                },
                version: 1,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastLogin: timestamp,
                ttl: ttl
            },
            ConditionExpression: 'attribute_not_exists(username) AND attribute_not_exists(email)'
        };

        try {
            await this.dynamoDB.put(command).promise();
            return { success: true };
        } catch (error) {
            logger.error('DAL Error - createUser:', error);
            throw error;
        }
    }

    async updatePassword(username, hashedPassword) {
        if (!username || !hashedPassword) {
            throw new Error('Username and new password are required');
        }

        const command = {
            TableName: this.tableName,
            Key: { username },
            UpdateExpression: 'SET #pwd = :pwd, updatedAt = :updatedAt, version = version + :inc',
            ExpressionAttributeNames: {
                '#pwd': 'password'
            },
            ExpressionAttributeValues: {
                ':pwd': hashedPassword,
                ':updatedAt': new Date().toISOString(),
                ':inc': 1
            },
            ConditionExpression: 'attribute_exists(username)'
        };

        try {
            await this.dynamoDB.update(command).promise();
            logger.info(`Password updated for user: ${username}`);
            return true;
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('User not found');
            }
            logger.error('DAL - Error updating password:', error);
            throw new Error('Database error while updating password');
        }
    }

    async updateUserMetadata(username, metadata) {
        const command = {
            TableName: this.tableName,
            Key: { username },
            UpdateExpression: 'SET metadata = :metadata, updatedAt = :updatedAt, version = version + :inc',
            ExpressionAttributeValues: {
                ':metadata': metadata,
                ':updatedAt': new Date().toISOString(),
                ':inc': 1
            },
            ReturnValues: 'ALL_NEW'
        };

        try {
            const response = await this.dynamoDB.update(command).promise();
            return response.Attributes;
        } catch (error) {
            logger.error('DAL Error - updateUserMetadata:', error);
            throw error;
        }
    }

    async updateLastLogin(username) {
        const command = {
            TableName: this.tableName,
            Key: { username },
            UpdateExpression: 'SET lastLogin = :lastLogin',
            ExpressionAttributeValues: {
                ':lastLogin': new Date().toISOString()
            }
        };

        try {
            await this.dynamoDB.update(command).promise();
        } catch (error) {
            logger.error('DAL Error - updateLastLogin:', error);
            // Don't throw error for login timestamp updates
        }
    }

    async getAllUsers() {
        const command = {
            TableName: this.tableName,
            ProjectionExpression: '#username, #role, createdAt, updatedAt, version',
            ExpressionAttributeNames: {
                '#username': 'username',
                '#role': 'role'
            }
        };

        try {
            const response = await this.dynamoDB.scan(command).promise();
            return response.Items;
        } catch (error) {
            logger.error('DAL - Error fetching all users:', error);
            throw new Error('Database error while fetching users');
        }
    }

    async getAllRoles() {
        try {
            const params = {
                TableName: this.tableName,
                ProjectionExpression: 'roleId, username, role, metadata'
            };

            const { Items } = await this.dynamoDB.scan(params).promise();
            return Items || [];
        } catch (error) {
            logger.error('DAL Error - getAllRoles:', error);
            // Return default roles if query fails
            return [
                { roleId: 'ROLE-1', username: 'strio_admin', role: 'admin' },
                { roleId: 'ROLE-2', username: 'strio_user', role: 'user' },
                { roleId: 'ROLE-3', username: 'strio_viewer', role: 'viewer' }
            ];
        }
    }
}

module.exports = AuthDAL;