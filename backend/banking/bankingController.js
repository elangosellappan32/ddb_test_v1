const bankingDAL = require('./bankingDAL');
const logger = require('../utils/logger');

const validateBankingData = (data) => {
    const requiredFields = ['pk', 'sk', 'siteName'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        return {
            isValid: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
        };
    }

    // Validate C values are numbers
    const cValues = ['c1', 'c2', 'c3', 'c4', 'c5'];
    for (const field of cValues) {
        const value = Number(data[field]);
        if (data[field] !== undefined && (isNaN(value) || value < 0)) {
            return {
                isValid: false,
                error: `${field} must be a positive number`
            };
        }
    }

    // Clean and transform the data
    const transformedData = {
        ...data,
        c1: Number(data.c1 || 0),
        c2: Number(data.c2 || 0),
        c3: Number(data.c3 || 0),
        c4: Number(data.c4 || 0),
        c5: Number(data.c5 || 0),
        siteName: data.siteName.trim()
    };

    return { isValid: true, data: transformedData };
};

const createBanking = async (req, res) => {
    try {
        const validation = validateBankingData(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const result = await bankingDAL.createBanking(validation.data);
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[BankingController] Create Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const getBanking = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const result = await bankingDAL.getBanking(pk, sk);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Banking record not found'
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[BankingController] Get Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const queryBankingByPeriod = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const result = await bankingDAL.queryBankingByPeriod(pk, sk);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[BankingController] Query Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateBanking = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        const validation = validateBankingData({ ...req.body, pk, sk });
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const result = await bankingDAL.updateBanking(pk, sk, validation.data);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[BankingController] Update Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

const deleteBanking = async (req, res) => {
    try {
        const { pk, sk } = req.params;
        await bankingDAL.deleteBanking(pk, sk);
        res.json({
            success: true,
            message: 'Banking record deleted successfully'
        });
    } catch (error) {
        logger.error('[BankingController] Delete Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllBanking = async (req, res) => {
    try {
        const result = await bankingDAL.getAllBanking();
        res.json({
            success: true,
            data: result.map(item => ({
                ...item,
                amount: Number(item.amount)
            }))
        });
    } catch (error) {
        logger.error('[BankingController] GetAll Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createBanking,
    getBanking,
    queryBankingByPeriod,
    updateBanking,
    deleteBanking,
    getAllBanking
};