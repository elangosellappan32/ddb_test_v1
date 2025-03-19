const productionUnitDAL = require('./productionUnitDAL');
const logger = require('../utils/logger');

// Get all production units
exports.getAllProductionUnits = async (req, res) => {
    try {
        const result = await productionUnitDAL.getAllProductionUnits();
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ProductionUnitController] GetAll Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
};

// Get production unit history
exports.getProductionUnitHistory = async (req, res) => {
    try {
        const { companyId, productionSiteId } = req.params;
        const result = await productionUnitDAL.getProductionUnitHistory(companyId, productionSiteId);
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ProductionUnitController] History Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
};

// Create production unit
exports.createProductionUnit = async (req, res) => {
    try {
        const { pk, sk, ...data } = req.body;
        
        if (!pk || !sk) {
            return res.status(400).json({
                success: false,
                message: 'pk and sk are required'
            });
        }

        const result = await productionUnitDAL.create({
            pk,
            sk,
            ...data
        });

        const isUpdate = result.version > 1;
        res.status(isUpdate ? 200 : 201).json({
            success: true,
            message: isUpdate ? 'Production unit updated' : 'Production unit created',
            data: result
        });

    } catch (error) {
        logger.error('[ProductionUnitController] Create Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get production unit
exports.getProductionUnit = async (req, res) => {
    try {
        const { companyId, productionSiteId, sk } = req.params;
        const pk = `${companyId}_${productionSiteId}`;

        const result = await productionUnitDAL.getItem(pk, sk);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Production unit not found',
                code: 'NOT_FOUND'
            });
        }

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ProductionUnitController] Get Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
};

// Update production unit
exports.updateProductionUnit = async (req, res) => {
    try {
        const { companyId, productionSiteId, sk } = req.params;
        const pk = `${companyId}_${productionSiteId}`;

        // Get current version first
        const currentItem = await productionUnitDAL.getItem(pk, sk);
        if (!currentItem) {
            return res.status(404).json({ 
                success: false,
                message: 'Production unit not found',
                code: 'NOT_FOUND'
            });
        }

        // Version validation with detailed feedback
        const receivedVersion = req.body.version;
        if (typeof receivedVersion !== 'number') {
            return res.status(400).json({ 
                success: false,
                message: 'Valid version number is required',
                code: 'INVALID_VERSION',
                details: {
                    current: currentItem.version,
                    received: receivedVersion,
                    expectedType: 'number',
                    action: 'Please provide a valid version number'
                }
            });
        }

        // Early version check with clear instructions
        if (receivedVersion !== currentItem.version) {
            logger.warn(`[ProductionUnitController] Version mismatch - Current: ${currentItem.version}, Received: ${receivedVersion}`);
            return res.status(409).json({
                success: false,
                message: `Version mismatch - Current: ${currentItem.version}, Received: ${receivedVersion}`,
                code: 'VERSION_CONFLICT',
                details: {
                    current: currentItem.version,
                    received: receivedVersion,
                    action: `Get latest version at GET /production-unit/${companyId}/${productionSiteId}/${sk}`,
                    currentData: currentItem
                }
            });
        }

        try {
            const result = await productionUnitDAL.updateItem(pk, sk, {
                ...req.body,
                version: currentItem.version
            });
            
            return res.json({
                success: true,
                message: 'Production unit updated successfully',
                data: result,
                version: {
                    previous: currentItem.version,
                    current: result.version
                }
            });
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                logger.warn(`[ProductionUnitController] Concurrent modification detected`);
                return res.status(409).json({
                    success: false,
                    message: 'Concurrent modification detected',
                    code: 'CONCURRENT_UPDATE',
                    details: {
                        current: currentItem.version,
                        received: receivedVersion,
                        action: 'Please refresh and retry with latest version'
                    }
                });
            }
            throw error;
        }
    } catch (error) {
        logger.error('[ProductionUnitController] Update Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};

// Delete production unit
exports.deleteProductionUnit = async (req, res) => {
    try {
        const { companyId, productionSiteId, sk } = req.params;
        const pk = `${companyId}_${productionSiteId}`;

        // First check if item exists
        const existingItem = await productionUnitDAL.getItem(pk, sk);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: 'Production unit not found',
                code: 'NOT_FOUND'
            });
        }

        const result = await productionUnitDAL.deleteItem(pk, sk);
        return res.json({
            success: true,
            message: 'Production unit deleted successfully',
            data: result
        });

    } catch (error) {
        logger.error('[ProductionUnitController] Delete Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};
