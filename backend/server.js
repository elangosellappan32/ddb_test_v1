require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const authRoutes = require('./auth/authRoutes');
const productionSiteRoutes = require('./productionSite/productionSiteRoutes');
const productionUnitRoutes = require('./productionUnit/productionUnitRoutes');
const productionChargeRoutes = require('./productionCharge/productionChargeRoutes');
const healthRoutes = require('./routes/healthRoutes');
const roleRoutes = require('./routes/roleRoutes');

const app = express();
const port = process.env.PORT || 3333;

// Configure DynamoDB
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'local',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
    }
});

const docClient = DynamoDBDocumentClient.from(client);
global.dynamoDb = docClient;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/production-site', productionSiteRoutes);
app.use('/api/production-unit', productionUnitRoutes);
app.use('/api/production-charge', productionChargeRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/roles', roleRoutes);

// Error handler
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server function
async function startServer() {
    try {
        const PORT = process.env.PORT || 3333;
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;