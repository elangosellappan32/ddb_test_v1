const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const AuthDAL = require('./authDal');

class AuthController {
    constructor() {
        this.authDal = new AuthDAL();
    }

    async login(username, password) {
        try {
            logger.info(`Login attempt for user: ${username}`);
            // Get user from UserTable
            const userData = await this.authDal.getUserFromUserTable(username);
            if (!userData) {
                throw new Error('User not found');
            }
            if (userData.password !== password) {
                throw new Error('Invalid credentials');
            }
            const permissions = userData.metadata?.permissions || (userData.role === 'admin' 
                ? ['CREATE', 'READ', 'UPDATE', 'DELETE']
                : ['READ']);
            const token = jwt.sign(
                {
                    username,
                    role: userData.role,
                    permissions,
                    emailId: userData.email
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            return {
                success: true,
                token,
                user: {
                    username,
                    role: userData.role,
                    permissions,
                    emailId: userData.email
                }
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    async validateToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            return {
                success: true,
                user: decoded
            };
        } catch (error) {
            logger.error('Token validation error:', error);
            throw new Error('Invalid token');
        }
    }
}

module.exports = new AuthController();