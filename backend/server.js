require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

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
const companyRoutes = require('./company/companyRoutes');
const siteAccessRoutes = require('./siteAccess/siteAccessRoutes');

const app = express();
const PORT = process.env.PORT || 3333;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes with clear naming
app.use('/api/site-access', siteAccessRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/production-site', productionSiteRoutes);
app.use('/api/production-unit', productionUnitRoutes);
app.use('/api/production-charge', productionChargeRoutes);
app.use('/api/consumption-site', consumptionSiteRoutes);
app.use('/api/consumption-unit', consumptionUnitRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/lapse', lapseRoutes);
app.use('/api/captive', captiveRoutes);
app.use('/api/company', companyRoutes);

// Add route logging before error handling
app.use((req, res, next) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            routes.push(`${Object.keys(middleware.route.methods)[0].toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    routes.push(`${Object.keys(handler.route.methods)[0].toUpperCase()} ${handler.route.path}`);
                }
            });
        }
    });
    logger.info('Registered Routes:', routes);
    next();
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const startServer = async () => {
    try {
        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;