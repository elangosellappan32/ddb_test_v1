// Constants for peak and non-peak periods
export const PEAK_PERIODS = ['c2', 'c3'];
export const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
export const ALL_PERIODS = [...PEAK_PERIODS, ...NON_PEAK_PERIODS];

export const ALLOCATION_TYPES = {
    ALLOCATION: 'Allocation',
    BANKING: 'Banking',
    LAPSE: 'Lapse'
};

export const isPeakPeriod = (period) => PEAK_PERIODS.includes(period);
export const isNonPeakPeriod = (period) => NON_PEAK_PERIODS.includes(period);

/**
 * Get display name for allocation type
 */
export const getTypeDisplayName = (type) => {
    switch (type?.toLowerCase()) {
        case 'banking':
            return 'Banking';
        case 'lapse':
            return 'Lapse';
        default:
            return 'Regular Allocation';
    }
};

/**
 * Returns a color code for different allocation types
 */
export const getAllocationTypeColor = (type) => {
    switch (type?.toLowerCase()) {
        case 'allocation':
            return '#2196f3'; // Blue
        case 'banking':
            return '#4caf50'; // Green
        case 'lapse':
            return '#f44336'; // Red
        default:
            return '#757575'; // Grey
    }
};

/**
 * Rounds all numeric values in an allocation object to integers
 */
export const roundAllocationValues = (allocation) => {
    if (!allocation?.allocated) return allocation;

    return {
        ...allocation,
        allocated: Object.entries(allocation.allocated).reduce((acc, [key, value]) => {
            acc[key] = Math.round(Number(value) || 0);
            return acc;
        }, {})
    };
};

/**
 * Validates basic allocation requirements
 */
export const validateAllocation = (allocation) => {
    const errors = [];

    if (!allocation.type) {
        errors.push('Allocation type is required');
    }

    if (!allocation.productionSiteId || !allocation.siteName) {
        errors.push('Production site information is required');
    }

    if (allocation.type === ALLOCATION_TYPES.ALLOCATION && !allocation.consumptionSiteId) {
        errors.push('Consumption site is required for regular allocations');
    }

    if (!allocation.month) {
        errors.push('Month is required');
    }

    if (!allocation.allocated || !Object.values(allocation.allocated).some(v => v > 0)) {
        errors.push('At least one period must have an allocation');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validates period rules for allocations
 */
export const validatePeriodRules = (allocation) => {
    const errors = [];
    if (!allocation?.allocated) {
        return { isValid: false, errors: ['No allocation data provided'] };
    }

    // Round all values
    const roundedAllocation = roundAllocationValues(allocation);
    const { allocated } = roundedAllocation;

    // Check peak periods
    for (const period of PEAK_PERIODS) {
        const allocatedAmount = Math.round(Number(allocated[period] || 0));
        if (allocatedAmount > 0) {
            const consumptionAmount = Math.round(
                Number(allocation.consumptionSite?.[period] || 0)
            );
            if (consumptionAmount === 0) {
                errors.push(`Cannot allocate peak period ${period} to non-peak consumption`);
            }
        }
    }

    // Check non-peak periods
    for (const period of NON_PEAK_PERIODS) {
        const allocatedAmount = Math.round(Number(allocated[period] || 0));
        if (allocatedAmount > 0) {
            const consumptionAmount = Math.round(
                Number(allocation.consumptionSite?.[period] || 0)
            );
            if (consumptionAmount === 0) {
                errors.push(`Cannot allocate non-peak period ${period} to peak consumption`);
            }
        }
    }

    // Check for negative values
    for (const period of ALL_PERIODS) {
        const value = Math.round(Number(allocated[period] || 0));
        if (value < 0) {
            errors.push(`Period ${period} cannot have negative value`);
        }
    }

    // Check mixing of peak and non-peak periods
    const hasPeak = PEAK_PERIODS.some(p => Math.round(Number(allocated[p] || 0)) > 0);
    const hasNonPeak = NON_PEAK_PERIODS.some(p => Math.round(Number(allocated[p] || 0)) > 0);
    if (hasPeak && hasNonPeak) {
        errors.push('Cannot mix peak and non-peak allocations');
    }

    return {
        isValid: errors.length === 0,
        errors,
        allocation: roundedAllocation
    };
};

/**
 * Calculates total units for a given allocation or unit data
 */
export const calculateTotal = (data, type = 'allocated') => {
    if (!data) return 0;
    const values = type === 'allocated' ? data[type] || data : data;
    return ALL_PERIODS.reduce((sum, period) => 
        sum + Math.round(Number(values[period] || 0)), 0
    );
};

/**
 * Calculate available units by period type
 */
export const calculateAvailableUnits = (site) => {
    const peak = PEAK_PERIODS.reduce((sum, period) => 
        sum + Math.round(Number(site[period] || 0)), 0
    );
    const nonPeak = NON_PEAK_PERIODS.reduce((sum, period) => 
        sum + Math.round(Number(site[period] || 0)), 0
    );
    return { peak, nonPeak };
};

/**
 * Format allocation data for display
 */
export const formatAllocationForDisplay = (allocation) => {
    if (!allocation) return null;
    
    return roundAllocationValues(allocation);
};

/**
 * Formats a date string or timestamp into a localized date string
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };

    return new Date(date).toLocaleDateString(undefined, defaultOptions);
};

/**
 * Formats a month number (1-12) and year into the API format (MMYYYY)
 */
export const formatAllocationMonth = (month, year = new Date().getFullYear()) => {
    return `${month.toString().padStart(2, '0')}${year}`;
};

/**
 * Groups allocations by their type
 */
export const groupAllocationsByType = (allocations) => {
    if (!Array.isArray(allocations)) return {};

    return allocations.reduce((groups, allocation) => {
        const type = allocation.type || 'unknown';
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(allocation);
        return groups;
    }, {});
};

/**
 * Sort allocations by date, newest first
 */
export const sortAllocationsByDate = (allocations) => {
    if (!Array.isArray(allocations)) return [];

    return [...allocations].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateB - dateA;
    });
};

/**
 * Get available allocation periods
 */
export const getAllocationPeriods = () => ([
    { id: 'c1', label: 'C1', isPeak: false },
    { id: 'c2', label: 'C2', isPeak: true },
    { id: 'c3', label: 'C3', isPeak: true },
    { id: 'c4', label: 'C4', isPeak: false },
    { id: 'c5', label: 'C5', isPeak: false }
]);

/**
 * Validates banking balance
 */
export const validateBankingBalance = (currentBalance, previousBalance) => {
    const errors = [];

    if (!previousBalance) {
        return { isValid: true, errors: [] };
    }

    ALL_PERIODS.forEach(period => {
        const current = Math.round(Number(currentBalance?.[period] || 0));
        const previous = Math.round(Number(previousBalance?.[period] || 0));

        if (current > previous) {
            errors.push(`Invalid banking balance for period ${period}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};