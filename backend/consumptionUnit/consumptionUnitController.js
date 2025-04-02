const consumptionUnitDAL = require('./consumptionUnitDAL');
const logger = require('../utils/logger');

const formatDateToMMYYYY = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${year}`;
};

const createConsumptionUnit = async (req, res) => {
    try {
        const { companyId, consumptionSiteId } = req.params;
        const now = new Date().toISOString();
        
        const unitData = {
            pk: `${companyId}_${consumptionSiteId}`,
            sk: req.body.sk || formatDateToMMYYYY(now),
            companyId,
            consumptionSiteId,
            c1: Number(req.body.c1 || 0),
            c2: Number(req.body.c2 || 0),
            c3: Number(req.body.c3 || 0),
            c4: Number(req.body.c4 || 0),
            c5: Number(req.body.c5 || 0),
            total: Number(req.body.c1 || 0) + 
                   Number(req.body.c2 || 0) + 
                   Number(req.body.c3 || 0) + 
                   Number(req.body.c4 || 0) + 
                   Number(req.body.c5 || 0),
            createdat: now,
            updatedat: now,
            version: 1
        };

        logger.info('[ConsumptionUnitController] Creating unit:', unitData);
        const result = await consumptionUnitDAL.createConsumptionUnit(unitData);
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ConsumptionUnitController] Create Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

const getConsumptionUnit = async (req, res) => {
    try {
        const { companyId, consumptionSiteId, sk } = req.params;
        const pk = `${companyId}_${consumptionSiteId}`;

        const result = await consumptionUnitDAL.getConsumptionUnit(pk, sk);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Consumption unit not found'
            });
        }

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ConsumptionUnitController] Get Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllConsumptionUnits = async (req, res) => {
    try {
        const { companyId, consumptionSiteId } = req.params;
        const pk = `${companyId}_${consumptionSiteId}`;
        
        const result = await consumptionUnitDAL.getAllConsumptionUnits(pk);
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ConsumptionUnitController] GetAll Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateConsumptionUnit = async (req, res) => {
    try {
        const { companyId, consumptionSiteId, sk } = req.params;
        const pk = `${companyId}_${consumptionSiteId}`;

        const existing = await consumptionUnitDAL.getConsumptionUnit(pk, sk);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Consumption unit not found'
            });
        }

        const updateData = {
            ...existing,
            ...req.body,
            pk,
            sk,
            c1: Number(req.body.c1 || existing.c1 || 0),
            c2: Number(req.body.c2 || existing.c2 || 0),
            c3: Number(req.body.c3 || existing.c3 || 0),
            c4: Number(req.body.c4 || existing.c4 || 0),
            c5: Number(req.body.c5 || existing.c5 || 0),
            total: Number(req.body.c1 || existing.c1 || 0) + 
                   Number(req.body.c2 || existing.c2 || 0) + 
                   Number(req.body.c3 || existing.c3 || 0) + 
                   Number(req.body.c4 || existing.c4 || 0) + 
                   Number(req.body.c5 || existing.c5 || 0),
            version: (existing.version || 0) + 1
        };

        const result = await consumptionUnitDAL.updateConsumptionUnit(pk, sk, updateData);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ConsumptionUnitController] Update Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteConsumptionUnit = async (req, res) => {
    try {
        const { companyId, consumptionSiteId, sk } = req.params;
        const pk = `${companyId}_${consumptionSiteId}`;

        const result = await consumptionUnitDAL.deleteConsumptionUnit(pk, sk);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Consumption unit not found'
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[ConsumptionUnitController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createConsumptionUnit,
    getConsumptionUnit,
    getAllConsumptionUnits,
    updateConsumptionUnit,
    deleteConsumptionUnit
};