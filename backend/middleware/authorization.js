const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const AuthDAL = require('../auth/authDal');
const authDal = new AuthDAL();

/**
 * Middleware to verify JWT token and attach user and role info to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get fresh role data from database
        const role = await authDal.getRoleById(decoded.roleId);
        if (!role) {
            return res.status(403).json({ error: 'Invalid role' });
        }

        // Attach user and role info to request
        req.user = {
            username: decoded.username,
            roleId: role.roleId,
            roleName: role.roleName,
            permissions: role.permissions
        };

        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to check if user has required permission for a resource
 */
const checkPermission = (resource, action) => {
    return (req, res, next) => {
        try {
            const userPermissions = req.user?.permissions?.[resource] || [];
            
            if (!userPermissions.includes(action)) {
                logger.warn(`Access denied: User ${req.user.username} attempted ${action} on ${resource}`);
                return res.status(403).json({ 
                    error: 'Access denied',
                    message: `You don't have permission to ${action} ${resource}`
                });
            }
            
            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            res.status(500).json({ error: 'Error checking permissions' });
        }
    };
};

module.exports = {
    authenticateToken,
    checkPermission
};
