const express = require('express');
const router = express.Router();
const productionChargeController = require('./productionChargeController');

// Get all production charges
router.get('/all', productionChargeController.getAllProductionCharges);

// Get production charge history
router.get('/history/:companyId/:productionSiteId', productionChargeController.getProductionChargeHistory);

// Get production charge by ID
router.get('/:companyId/:productionSiteId/:month', productionChargeController.getProductionCharge);

// Create production charge
router.post('/', productionChargeController.createProductionCharge);

// Update production charge
router.put('/:companyId/:productionSiteId/:month', productionChargeController.updateProductionCharge);

// Delete production charge
router.delete('/:companyId/:productionSiteId/:month', productionChargeController.deleteProductionCharge);

module.exports = router;