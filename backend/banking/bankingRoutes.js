const express = require('express');
const router = express.Router();
const bankingController = require('./bankingController');

// Create banking record
router.post('/', bankingController.createBanking);

// Get all banking records
router.get('/', bankingController.getAllBanking);

// Get specific banking record
router.get('/:pk/:sk', bankingController.getBanking);

// Query banking by sk
router.get('/:pk/:sk/query', bankingController.queryBankingByPeriod);

// Update banking record
router.put('/:pk/:sk', bankingController.updateBanking);

// Delete banking record
router.delete('/:pk/:sk', bankingController.deleteBanking);

module.exports = router;