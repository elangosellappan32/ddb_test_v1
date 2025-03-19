const express = require('express');
const router = express.Router();
const productionUnitController = require('./productionUnitController');

// Get all production units
router.get('/all', productionUnitController.getAllProductionUnits);

// Get production unit history
router.get('/history/:companyId/:productionSiteId', productionUnitController.getProductionUnitHistory);

// Create production unit
router.post('/', productionUnitController.createProductionUnit);

// Get production unit by ID
router.get('/:companyId/:productionSiteId/:sk', productionUnitController.getProductionUnit);

// Update production unit
router.put('/:companyId/:productionSiteId/:sk', productionUnitController.updateProductionUnit);

// Delete production unit
router.delete('/:companyId/:productionSiteId/:sk', productionUnitController.deleteProductionUnit);

module.exports = router;