const express = require('express');
const router = express.Router();
const productionSiteController = require('./productionSiteController');

// GET all production sites
router.get('/all', productionSiteController.getAllProductionSites);

// GET production site by IDs
router.get('/:companyId/:productionSiteId', productionSiteController.getProductionSite);

// CREATE new production site
router.post('/', productionSiteController.createProductionSite);

// UPDATE production site
router.put('/:companyId/:productionSiteId', productionSiteController.updateProductionSite);

// DELETE production site
router.delete('/:companyId/:productionSiteId', productionSiteController.deleteProductionSite);

module.exports = router;
