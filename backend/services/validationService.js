const { PEAK_PERIODS, NON_PEAK_PERIODS, ALL_PERIODS } = require('../constants/periods');
const logger = require('../utils/logger');

class ValidationService {
    validateAllocation(data) {
        const errors = [];
        const normalizedData = this.normalizeAllocationData(data);

        // Common validations
        const commonFields = ['productionSiteId', 'productionSite', 'siteName', 'month', 'allocated'];
        const missingCommon = commonFields.filter(field => !normalizedData[field]);
        if (missingCommon.length > 0) {
            errors.push(`Missing common fields: ${missingCommon.join(', ')}`);
        }

        // Type-specific validation
        const type = normalizedData.type?.toUpperCase() || 'ALLOCATION';
        switch (type) {
            case 'ALLOCATION':
                if (!normalizedData.consumptionSiteId || !normalizedData.consumptionSite) {
                    errors.push('Consumption site details are required for regular allocations');
                }
                break;

            case 'BANKING':
                // Banking validation is now more lenient - we auto-enable it if needed
                normalizedData.bankingEnabled = true;
                break;

            case 'LAPSE':
                // Lapse doesn't need additional validation
                break;

            default:
                errors.push(`Invalid allocation type: ${type}`);
        }

        // Validate allocated units
        if (normalizedData.allocated) {
            // Check for negative values
            const negativeUnits = Object.entries(normalizedData.allocated)
                .filter(([_, value]) => Number(value) < 0)
                .map(([period]) => period);
            
            if (negativeUnits.length > 0) {
                errors.push(`Negative values not allowed for periods: ${negativeUnits.join(', ')}`);
            }

            // Normalize allocated values
            normalizedData.allocated = this.normalizeAllocatedValues(normalizedData.allocated);

            // Ensure at least one period has units
            const totalUnits = Object.values(normalizedData.allocated)
                .reduce((sum, val) => sum + val, 0);
            
            if (totalUnits === 0) {
                errors.push('At least one period must have units allocated');
            }

            // Validate peak/non-peak mixing only for regular allocations
            if (type === 'ALLOCATION') {
                const mixingResult = this.validatePeakNonPeakMixing(normalizedData.allocated);
                if (!mixingResult.isValid) {
                    errors.push(mixingResult.error);
                }
            }
        }

        // Generate keys if not provided
        if (!normalizedData.pk) {
            normalizedData.pk = type === 'ALLOCATION'
                ? `${normalizedData.productionSiteId}_${normalizedData.consumptionSiteId}`
                : `${normalizedData.companyId || '1'}_${normalizedData.productionSiteId}`;
        }
        if (!normalizedData.sk) {
            normalizedData.sk = normalizedData.month;
        }

        // Add metadata
        normalizedData.timestamp = new Date().toISOString();
        normalizedData.version = Number(normalizedData.version || 1);

        return {
            isValid: errors.length === 0,
            errors,
            normalizedData
        };
    }

    validatePeakNonPeakMixing(allocated) {
        const hasPeak = PEAK_PERIODS.some(period => allocated[period] > 0);
        const hasNonPeak = NON_PEAK_PERIODS.some(period => allocated[period] > 0);

        if (hasPeak && hasNonPeak) {
            return {
                isValid: false,
                error: 'Cannot mix peak and non-peak period allocations'
            };
        }

        return { isValid: true };
    }

    normalizeAllocatedValues(allocated = {}) {
        return ALL_PERIODS.reduce((acc, period) => {
            const val = Number(allocated[period]);
            acc[period] = isNaN(val) ? 0 : Math.max(0, Math.round(val));
            return acc;
        }, {});
    }

    normalizeAllocationData(data) {
        const normalized = {
            ...data,
            companyId: String(data.companyId || '1'),
            productionSiteId: String(data.productionSiteId || ''),
            type: (data.type || 'ALLOCATION').toUpperCase(),
            month: data.month || '',
            siteName: data.siteName || data.productionSite || '',
            productionSite: data.productionSite || data.siteName || '',
            allocated: this.normalizeAllocatedValues(data.allocated)
        };

        if (data.consumptionSiteId) {
            normalized.consumptionSiteId = String(data.consumptionSiteId);
            normalized.consumptionSite = data.consumptionSite || '';
        }

        return normalized;
    }
}

module.exports = new ValidationService();