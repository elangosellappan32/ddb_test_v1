const express = require('express');
const router = express.Router();
const allocationController = require('./allocationController');
const validateJson = require('../middleware/validateJson');

// Create single allocation
router.post('/', validateJson, allocationController.createAllocation);

// Create batch allocations
router.post('/batch', validateJson, allocationController.createAllocation);

// Get all allocations for a month
router.get('/month/:month', allocationController.getAllocations);

// Get allocations by period and month
router.get('/period/:period/month/:month', allocationController.getAllocationsByPeriod);

// Update allocation
router.put('/:pk/:sk', validateJson, allocationController.updateAllocation);

// Delete allocation
router.delete('/:pk/:sk', allocationController.deleteAllocation);

module.exports = router;