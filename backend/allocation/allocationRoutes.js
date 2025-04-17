const express = require('express');
const router = express.Router();
const allocationController = require('./allocationController');
const validateAllocation = require('../middleware/validateAllocation');
const validateJson = require('../middleware/validateJson');

// Create single allocation
router.post('/', validateJson, validateAllocation, allocationController.createAllocation);

// Create batch allocations
router.post('/batch', validateJson, validateAllocation, allocationController.createAllocation);

// Get all allocations for a month
router.get('/month/:month', allocationController.getAllocations);

// Update allocation
router.put('/:pk/:sk', validateJson, validateAllocation, allocationController.updateAllocation);

// Delete allocation
router.delete('/:pk/:sk', allocationController.deleteAllocation);

module.exports = router;