const express = require('express');
const router = express.Router();
const { getAvailableSites, addExistingSiteAccess, validateSiteType } = require('../services/siteAccessService');
const { authenticateToken } = require('../middleware/authorization');
const logger = require('../utils/logger');

// Get available sites of a specific type
router.get('/available-sites/:siteType', authenticateToken, async (req, res) => {
    try {
        const { siteType } = req.params;

        // Validate site type
        try {
            validateSiteType(siteType);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: 'INVALID_SITE_TYPE'
            });
        }
        
        // Get available sites
        const sites = await getAvailableSites(siteType);

        res.json({
            success: true,
            data: sites
        });
    } catch (error) {
        logger.error('[SiteAccessRoutes] Error getting available sites:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available sites',
            error: error.message
        });
    }
});

// Grant access to existing sites
router.post('/grant-access', authenticateToken, async (req, res) => {
    try {
        const { userId, siteIds, siteType } = req.body;

        // Validate required fields
        if (!userId || !Array.isArray(siteIds) || !siteType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                code: 'MISSING_FIELDS'
            });
        }

        // Validate site type
        try {
            validateSiteType(siteType);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: 'INVALID_SITE_TYPE'
            });
        }

        await addExistingSiteAccess(userId, siteIds, siteType);
        res.json({
            success: true,
            message: `Successfully granted ${siteType} site access`
        });
    } catch (error) {
        logger.error('[SiteAccessRoutes] Error granting site access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant site access',
            error: error.message
        });
    }
});

module.exports = router;
