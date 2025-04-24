const { PEAK_PERIODS, NON_PEAK_PERIODS, ALL_PERIODS } = require('../constants/periods');
const logger = require('../utils/logger');

class ValidationService {
    validateAllocation(data) {
        const errors = [];
        const normalizedData = this.normalizeAllocationData(data);

        // Common validations
        if (!normalizedData.companyId) {
            errors.push('Company ID is required');
        }

        if (!normalizedData.productionSiteId) {
            errors.push('Production site ID is required');
        }

        if (!normalizedData.month) {
            errors.push('Month is required');
        }

        // Type-specific validation
        switch (normalizedData.type?.toUpperCase()) {
            case 'ALLOCATION':
                if (!normalizedData.consumptionSiteId) {
                    errors.push('Consumption site ID is required for regular allocations');
                }
                break;

            case 'BANKING':
                if (!normalizedData.bankingEnabled) {
                    errors.push('Banking is not enabled for this production site');
                }
                break;

            case 'LAPSE':
                if (!normalizedData.reason) {
                    errors.push('Reason is required for lapse allocations');
                }
                break;

            default:
                errors.push('Invalid allocation type');
        }

        // Validate allocated units
        if (normalizedData.allocated) {
            // Validate numeric values
            ALL_PERIODS.forEach(period => {
                const value = normalizedData.allocated[period];
                if (value !== undefined && (isNaN(Number(value)) || Number(value) < 0)) {
                    errors.push(`Invalid value for period ${period}`);
                }
            });

            // Check for peak and non-peak mixing
            const peakResult = this.validatePeakNonPeakMixing(normalizedData.allocated);
            if (!peakResult.isValid) {
                errors.push(peakResult.error);
            }
        } else {
            errors.push('Allocated units are required');
        }

        return {
            isValid: errors.length === 0,
            errors,
            normalizedData
        };
    }

    validatePeakNonPeakMixing(allocated) {
        const normalized = this.normalizeAllocatedValues(allocated);
        const hasPeak = PEAK_PERIODS.some(period => normalized[period] > 0);
        const hasNonPeak = NON_PEAK_PERIODS.some(period => normalized[period] > 0);

        return {
            isValid: !(hasPeak && hasNonPeak),
            error: hasPeak && hasNonPeak ? 'Cannot mix peak and non-peak allocations' : null
        };
    }

    normalizeAllocatedValues(allocated = {}) {
        return ALL_PERIODS.reduce((acc, period) => {
            acc[period] = Math.round(Number(allocated[period] || 0));
            return acc;
        }, {});
    }

    normalizeAllocationData(data) {
        return {
            ...data,
            allocated: this.normalizeAllocatedValues(data.allocated),
            companyId: String(data.companyId || ''),
            productionSiteId: String(data.productionSiteId || ''),
            consumptionSiteId: data.consumptionSiteId ? String(data.consumptionSiteId) : undefined,
            type: (data.type || 'ALLOCATION').toUpperCase(),
            version: Number(data.version || 1)
        };
    }
}

module.exports = new ValidationService();