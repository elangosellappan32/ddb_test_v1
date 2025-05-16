const captiveDAL = require('./captiveDAL');
const logger = require('../utils/logger');

// Get Captive entries by Generator Company ID
exports.getCaptiveEntriesByGenerator = async (req, res) => {
    try {
        const { generatorCompanyId } = req.params;
        const entries = await captiveDAL.getCaptivesByGenerator(generatorCompanyId);
        res.status(200).json(entries);
    } catch (error) {
        logger.error('Controller error in getCaptiveEntriesByGenerator:', error);
        res.status(500).json({ 
            message: 'Error fetching Captive entries', 
            error: error.message 
        });
    }
};

// Get Captive entries by Shareholder Company ID
exports.getCaptiveEntriesByShareholder = async (req, res) => {
    try {
        const { shareholderCompanyId } = req.params;
        const entries = await captiveDAL.getCaptivesByShareholder(shareholderCompanyId);
        res.status(200).json(entries);
    } catch (error) {
        logger.error('Controller error in getCaptiveEntriesByShareholder:', error);
        res.status(500).json({ 
            message: 'Error fetching Captive entries', 
            error: error.message 
        });
    }
};

// Get specific Captive entry
exports.getCaptiveEntry = async (req, res) => {
    try {
        const { generatorCompanyId, shareholderCompanyId } = req.params;
        const entry = await captiveDAL.getCaptive(generatorCompanyId, shareholderCompanyId);
        if (!entry) {
            return res.status(404).json({ 
                message: 'Captive entry not found' 
            });
        }
        res.status(200).json(entry);
    } catch (error) {
        logger.error('Controller error in getCaptiveEntry:', error);
        res.status(500).json({ 
            message: 'Error fetching Captive entry', 
            error: error.message 
        });
    }
};

// Get all Captive entries
exports.getAllCaptives = async (req, res) => {
    try {
        const entries = await captiveDAL.getAllCaptives();
        res.status(200).json(entries);
    } catch (error) {
        logger.error('Controller error in getAllCaptives:', error);
        res.status(500).json({ 
            message: 'Error fetching all Captive entries', 
            error: error.message 
        });
    }
};
