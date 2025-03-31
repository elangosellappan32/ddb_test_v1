const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const productionRoutes = require('./production/productionRoutes');
const errorHandler = require('./middleware/errorHandler');
const productionController = require('./production/productionController');
const validateJson = require('./middleware/validateJson');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const productionDataRoutes = require('./routes/productionDataRoutes');
const productionUnitRoutes = require('./productionUnit/productionUnitRoutes');
const productionChargeRoutes = require('./productionCharge/productionChargeRoutes');
const productionSiteRoutes = require('./productionSite/productionSiteRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authLogger = require('./middleware/authLogger');
const authRoutes = require('./auth/authRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Request parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// JSON validation middleware
app.use(validateJson);

// Add logger middleware
app.use(authLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/production-unit', productionUnitRoutes);
app.use('/api/production-charge', productionChargeRoutes);
app.use('/api/production-site', productionSiteRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Global error handler
app.use(errorHandler);

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.error('JSON Parse Error:', err);
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid JSON format'
        });
    }
    logger.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Export app
module.exports = app;