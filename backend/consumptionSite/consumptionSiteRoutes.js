const express = require('express');
const router = express.Router();
const consumptionSiteController = require('./consumptionSiteController');
const validateConsumptionSite = require('../middleware/validateConsumptionSite');
const validateConsumptionSiteUpdate = require('../middleware/validateConsumptionSiteUpdate');

// Ensure all controller methods exist before using them
router.get('/all', consumptionSiteController.getAllConsumptionSites);
router.get('/:companyId/:consumptionSiteId', consumptionSiteController.getConsumptionSite);
router.post('/', validateConsumptionSite, consumptionSiteController.createConsumptionSite);
router.put('/:companyId/:consumptionSiteId', validateConsumptionSiteUpdate, consumptionSiteController.updateConsumptionSite);
router.delete('/:companyId/:consumptionSiteId', consumptionSiteController.deleteConsumptionSite);

module.exports = router;
