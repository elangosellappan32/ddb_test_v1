const express = require('express');
const router = express.Router();
const packageJson = require('../package.json');

/**
 * Health check endpoint
 * Returns basic server status without database checks
 */
router.get('/', (req, res) => {
    const serverInfo = {
        status: 'up',
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        apiVersion: 'v1'
    };

    res.json(serverInfo);
});

module.exports = router;