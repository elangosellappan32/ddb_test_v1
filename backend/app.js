require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { authenticateToken, checkPermission } = require('./middleware/authorization');

// Import routes
const authRoutes = require('./auth/authRoutes');
const productionSiteRoutes = require('./productionSite/productionSiteRoutes');
const productionUnitRoutes = require('./productionUnit/productionUnitRoutes');
const productionChargeRoutes = require('./productionCharge/productionChargeRoutes');
const consumptionSiteRoutes = require('./consumptionSite/consumptionSiteRoutes');
const consumptionUnitRoutes = require('./consumptionUnit/consumptionUnitRoutes');
const allocationRoutes = require('./allocation/allocationRoutes');
const healthRoutes = require('./routes/healthRoutes');
const roleRoutes = require('./routes/roleRoutes');
const bankingRoutes = require('./banking/bankingRoutes');
const lapseRoutes = require('./lapse/lapseRoutes');
const captiveRoutes = require('./captive/captiveRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'up', timestamp: new Date().toISOString() });
});

// API Routes
console.log('Mounting API routes...');

// Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);

// Protected routes (require authentication)
app.use('/api/roles', authenticateToken, roleRoutes);

// Protected routes with resource-specific permissions
app.use('/api/production-site', authenticateToken, 
    checkPermission('production', 'READ'),
    productionSiteRoutes);
    
app.use('/api/production-unit', authenticateToken,
    checkPermission('production-units', 'READ'),
    productionUnitRoutes);
    
app.use('/api/production-charge', authenticateToken,
    checkPermission('production-charges', 'READ'),
    productionChargeRoutes);
    
app.use('/api/consumption-site', authenticateToken,
    checkPermission('consumption', 'READ'),
    consumptionSiteRoutes);
    
app.use('/api/consumption-unit', authenticateToken,
    checkPermission('consumption-units', 'READ'),
    consumptionUnitRoutes);
    
app.use('/api/allocation', authenticateToken,
    checkPermission('allocation', 'READ'),
    allocationRoutes);
    
app.use('/api/banking', authenticateToken,
    checkPermission('banking', 'READ'),
    bankingRoutes);
    
app.use('/api/lapse', authenticateToken,
    checkPermission('lapse', 'READ'),
    lapseRoutes);
    
app.use('/api/captive', authenticateToken,
    checkPermission('captive', 'READ'),
    captiveRoutes);

console.log('All routes mounted with authorization');

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    
    // Specific error handling
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    if (err.name === 'ConditionalCheckFailedException') {
        return res.status(409).json({
            success: false,
            message: 'Version conflict or item already exists'
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;