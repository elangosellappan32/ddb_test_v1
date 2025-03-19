require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const setupTables = require('./scripts/setupTables');
const productionSiteRoutes = require('./productionSite/productionSiteRoutes');
const productionUnitRoutes = require('./productionUnit/productionUnitRoutes');
const productionChargeRoutes = require('./productionCharge/productionChargeRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const port = process.env.PORT || 3333;

// Configure DynamoDB
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'local',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
    }
});

const docClient = DynamoDBDocumentClient.from(client);
global.dynamoDb = docClient;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Request logging
app.use((req, res, next) => {
    logger.info(`[REQUEST] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        logger.info('[REQUEST BODY]', req.body);
    }
    next();
});

// Health check endpoint
app.use('/api/health', healthRoutes);

// API Routes
app.use('/api/production-site', productionSiteRoutes);
app.use('/api/production-unit', productionUnitRoutes);
app.use('/api/production-charge', productionChargeRoutes);

// Response logging
app.use((req, res, next) => {
    const oldJson = res.json;
    res.json = function(data) {
        logger.info(`[RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode}`);
        return oldJson.call(this, data);
    };
    next();
});

// 404 handler
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource does not exist'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Start server function
async function startServer() {
    try {
        logger.info('Starting server initialization...');

        // Ensure tables exist before starting server
        logger.info('Setting up DynamoDB tables...');
        await setupTables();
        logger.info('Tables setup completed');

        const PORT = process.env.PORT || 3333;
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`DynamoDB endpoint: ${process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Only start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;