const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authorization');
const siteAccessService = require('../services/siteAccessService');
const logger = require('../utils/logger');

router.post('/update-site-access', authenticateToken, async (req, res) => {
    try {
        const { userId, companyId, siteId, siteType } = req.body;
        
        if (!userId || !companyId || !siteId || !siteType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, companyId, siteId, siteType'
            });
        }

        logger.info('[SiteAccess] Processing update request:', { userId, companyId, siteId, siteType });

        const updatedUser = await siteAccessService.updateUserSiteAccess(
            userId,
            companyId,
            siteId,
            siteType
        );

        res.json({
            success: true,
            message: 'Site access updated successfully',
            data: updatedUser
        });
    } catch (error) {
        logger.error('[SiteAccess] Update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get available sites
router.get('/available-sites/:siteType', authenticateToken, async (req, res) => {
    try {
        const { siteType } = req.params;
        const sites = await siteAccessService.getAvailableSites(siteType);
        res.json({
            success: true,
            data: sites
        });
    } catch (error) {
        logger.error('[SiteAccessRoutes] Get available sites error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
