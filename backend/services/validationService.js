const { PEAK_PERIODS, NON_PEAK_PERIODS, ALL_PERIODS } = require('../constants/periods');
const logger = require('../utils/logger');

class ValidationService {
    validateFinancialYear(financialYear) {
        if (!financialYear) return false;
        
        // Financial year should be in format YYYY-YYYY
        const pattern = /^\d{4}-\d{4}$/;
        if (!pattern.test(financialYear)) return false;
        
        const [startYear, endYear] = financialYear.split('-').map(Number);
        return endYear === startYear + 1;
    }

    validateAllocation(data) {
        const errors = [];
        
        // Validate required fields
        if (!data.productionSiteId) errors.push('Production site ID is required');
        if (!data.allocated) errors.push('Allocated units are required');
        if (!data.type) errors.push('Allocation type is required');
        if (!data.financialYear) errors.push('Financial year is required');
        
        // Validate financial year format
        if (data.financialYear && !this.validateFinancialYear(data.financialYear)) {
            errors.push('Financial year must be in format YYYY-YYYY and span consecutive years');
        }
        
        // Validate allocation type
        const validTypes = ['BANKING', 'LAPSE', 'ALLOCATION'];
        if (data.type && !validTypes.includes(data.type.toUpperCase())) {
            errors.push(`Type must be one of: ${validTypes.join(', ')}`);
        }
        
        // Validate allocated units
        if (data.allocated) {
            const normalizedAllocated = this.normalizeAllocatedValues(data.allocated);
            const total = Object.values(normalizedAllocated).reduce((sum, val) => sum + val, 0);
            
            if (total <= 0) {
                errors.push('Total allocated units must be greater than 0');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            normalizedData: {
                ...data,
                allocated: data.allocated ? this.normalizeAllocatedValues(data.allocated) : {}
            }
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