const productionChargeDAL = require('./productionChargeDAL');
const logger = require('../utils/logger');

// Get all production charges
exports.getAllProductionCharges = async (req, res) => {
    try {
        const result = await productionChargeDAL.getAllProductionCharges();
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ProductionChargeController] GetAll Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
};

// Get production charge history
exports.getProductionChargeHistory = async (req, res) => {
    try {
        const { companyId, productionSiteId } = req.params;
        const result = await productionChargeDAL.getProductionChargeHistory(companyId, productionSiteId);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ProductionChargeController] GetHistory Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get production charge history',
            error: error.message
        });
    }
};

// Create production charge
exports.createProductionCharge = async (req, res) => {
    try {
        // Validate and format date
        const { companyId, productionSiteId, month, year, ...chargeData } = req.body;
        
        // Validate required fields
        if (!companyId || !productionSiteId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: companyId, productionSiteId, month, year',
                code: 'INVALID_INPUT'
            });
        }

        // Validate month format (1-12)
        const monthNum = parseInt(month, 10);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month. Must be between 1 and 12',
                code: 'INVALID_MONTH'
            });
        }

        // Validate year format (YYYY)
        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || year.length !== 4) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year format. Must be YYYY',
                code: 'INVALID_YEAR'
            });
        }

        // Format month to 2 digits (e.g., 1 -> 01)
        const formattedMonth = monthNum.toString().padStart(2, '0');
        
        // Create pk and sk
        const pk = `${companyId}_${productionSiteId}`;
        const sk = `${formattedMonth}${year}`;

        const result = await productionChargeDAL.create({
            pk,
            sk,
            ...chargeData
        });

        res.status(201).json({
            success: true,
            message: 'Production charge created successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionChargeController] Create Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create production charge',
            error: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
};

// Get production charge
exports.getProductionCharge = async (req, res) => {
    try {
        const { companyId, productionSiteId, month } = req.params;
        const pk = `${companyId}_${productionSiteId}`;
        const result = await productionChargeDAL.getItem(pk, month);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Production charge not found'
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ProductionChargeController] Get Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get production charge',
            error: error.message
        });
    }
};

// Update production charge
exports.updateProductionCharge = async (req, res) => {
    try {
        const { companyId, productionSiteId, month } = req.params;
        const pk = `${companyId}_${productionSiteId}`;
        
        // Get current version
        const current = await productionChargeDAL.getItem(pk, month);
        if (!current) {
            return res.status(404).json({
                success: false,
                message: 'Production charge not found'
            });
        }

        if (current.version !== req.body.version) {
            return res.status(409).json({
                success: false,
                message: 'Version mismatch',
                currentVersion: current.version,
                receivedVersion: req.body.version
            });
        }

        const result = await productionChargeDAL.updateItem(pk, month, req.body);
        res.json({
            success: true,
            message: 'Production charge updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionChargeController] Update Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update production charge',
            error: error.message
        });
    }
};

// Delete production charge
exports.deleteProductionCharge = async (req, res) => {
    try {
        const { companyId, productionSiteId, month } = req.params;
        const pk = `${companyId}_${productionSiteId}`;
        
        const result = await productionChargeDAL.deleteItem(pk, month);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Production charge not found'
            });
        }

        res.json({
            success: true,
            message: 'Production charge deleted successfully',
            data: result
        });
    } catch (error) {
        logger.error('[ProductionChargeController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete production charge',
            error: error.message
        });
    }
};

exports.getItem = async (req, res) => {
    try {
        const { companyId, productionSiteId, month } = req.params;
        const pk = `${companyId}_${productionSiteId}`;
        const sk = month;

        const item = await productionChargeDAL.getItem(pk, sk);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Production charge not found',
                code: 'NOT_FOUND'
            });
        }

        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        logger.error('[ProductionChargeController] GetItem Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};