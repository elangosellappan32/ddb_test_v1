const logger = require('../utils/logger');

class ValidationService {
    constructor() {
        this.PEAK_PERIODS = ['c2', 'c3'];
        this.NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
    }

    validateAllocation(allocation) {
        const errors = [];

        try {
            // Validate required fields
            if (!allocation.productionSiteId || !allocation.siteName || !allocation.type || !allocation.month) {
                errors.push('Missing required fields');
                return { isValid: false, errors };
            }

            // Validate allocated units are integers
            if (allocation.allocated) {
                for (const [period, value] of Object.entries(allocation.allocated)) {
                    const roundedValue = Math.round(Number(value));
                    if (isNaN(roundedValue) || roundedValue < 0) {
                        errors.push(`Invalid value for period ${period}`);
                    }
                    // Update the value to be an integer
                    allocation.allocated[period] = roundedValue;
                }
            }

            // Type-specific validation
            switch (allocation.type.toLowerCase()) {
                case 'allocation':
                    if (!this.validateRegularAllocation(allocation)) {
                        errors.push('Invalid regular allocation');
                    }
                    break;

                case 'banking':
                    if (!this.validateBankingAllocation(allocation)) {
                        errors.push('Invalid banking allocation');
                    }
                    break;

                case 'lapse':
                    if (!this.validateLapseAllocation(allocation)) {
                        errors.push('Invalid lapse allocation');
                    }
                    break;

                default:
                    errors.push('Invalid allocation type');
            }

            return {
                isValid: errors.length === 0,
                errors,
                allocation // Return the allocation with rounded values
            };
        } catch (error) {
            logger.error('Validation Service', 'Validation Error', {
                error: error.message,
                stack: error.stack,
                allocation: JSON.stringify(allocation)
            });
            errors.push('Validation error occurred');
            return { isValid: false, errors };
        }
    }

    validateRegularAllocation(allocation) {
        if (!allocation.consumptionSiteId || !allocation.consumptionSite) {
            return false;
        }

        // Validate period rules
        let isValid = true;
        const allocated = allocation.allocated || {};

        // Check peak periods
        this.PEAK_PERIODS.forEach(period => {
            const allocatedAmount = Math.round(Number(allocated[period] || 0));
            const consumptionAmount = Math.round(Number(allocation.consumptionSite[period] || 0));
            
            if (allocatedAmount > 0 && consumptionAmount === 0) {
                isValid = false;
            }
        });

        // Check non-peak periods
        this.NON_PEAK_PERIODS.forEach(period => {
            const allocatedAmount = Math.round(Number(allocated[period] || 0));
            const consumptionAmount = Math.round(Number(allocation.consumptionSite[period] || 0));
            
            if (allocatedAmount > 0 && consumptionAmount === 0) {
                isValid = false;
            }
        });

        return isValid;
    }

    validateBankingAllocation(allocation) {
        if (!allocation.bankingEnabled) {
            return false;
        }

        // Validate that banking amounts are integers and non-negative
        const allocated = allocation.allocated || {};
        return [...this.PEAK_PERIODS, ...this.NON_PEAK_PERIODS].every(period => {
            const value = Math.round(Number(allocated[period] || 0));
            return !isNaN(value) && value >= 0;
        });
    }

    validateLapseAllocation(allocation) {
        const allocated = allocation.allocated || {};
        
        // Validate that lapse amounts are integers and non-negative
        const validValues = [...this.PEAK_PERIODS, ...this.NON_PEAK_PERIODS].every(period => {
            const value = Math.round(Number(allocated[period] || 0));
            return !isNaN(value) && value >= 0;
        });

        // Ensure there are actual units to lapse
        const hasUnits = Object.values(allocated).some(value => 
            Math.round(Number(value)) > 0
        );

        return validValues && hasUnits;
    }

    validateBankingBalance(currentBalance, previousBalance) {
        const errors = [];
        
        try {
            // Convert all values to integers
            const current = Object.entries(currentBalance || {}).reduce((acc, [key, value]) => {
                acc[key] = Math.round(Number(value));
                return acc;
            }, {});

            const previous = Object.entries(previousBalance || {}).reduce((acc, [key, value]) => {
                acc[key] = Math.round(Number(value));
                return acc;
            }, {});

            // Validate each period
            [...this.PEAK_PERIODS, ...this.NON_PEAK_PERIODS].forEach(period => {
                const currentValue = current[period] || 0;
                const previousValue = previous[period] || 0;

                if (currentValue > previousValue) {
                    errors.push(`Invalid banking balance for period ${period}: current(${currentValue}) > previous(${previousValue})`);
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                currentBalance: current,
                previousBalance: previous
            };
        } catch (error) {
            logger.error('Validation Service', 'Banking Balance Validation Error', {
                error: error.message,
                stack: error.stack,
                currentBalance: JSON.stringify(currentBalance),
                previousBalance: JSON.stringify(previousBalance)
            });
            errors.push('Banking balance validation error occurred');
            return { isValid: false, errors };
        }
    }
}

module.exports = new ValidationService();