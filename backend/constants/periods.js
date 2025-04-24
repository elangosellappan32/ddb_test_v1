/**
 * Period constants used across all services
 * The periods are divided into peak and non-peak categories
 */

const PEAK_PERIODS = ['c2', 'c3'];
const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
const ALL_PERIODS = [...PEAK_PERIODS, ...NON_PEAK_PERIODS];

const PERIOD_LABELS = {
    c1: 'C1 (Non-Peak)',
    c2: 'C2 (Peak)',
    c3: 'C3 (Peak)',
    c4: 'C4 (Non-Peak)',
    c5: 'C5 (Non-Peak)'
};

const PERIOD_TYPES = {
    PEAK: 'peak',
    NON_PEAK: 'non-peak'
};

const PERIOD_METADATA = {
    c1: { 
        type: PERIOD_TYPES.NON_PEAK, 
        label: 'C1',
        description: 'Non-Peak Period',
        order: 1,
        isFlexible: false
    },
    c2: { 
        type: PERIOD_TYPES.PEAK, 
        label: 'C2',
        description: 'Peak Period',
        order: 2,
        isFlexible: true
    },
    c3: { 
        type: PERIOD_TYPES.PEAK, 
        label: 'C3',
        description: 'Peak Period',
        order: 3,
        isFlexible: true
    },
    c4: { 
        type: PERIOD_TYPES.NON_PEAK, 
        label: 'C4',
        description: 'Non-Peak Period',
        order: 4,
        isFlexible: false
    },
    c5: { 
        type: PERIOD_TYPES.NON_PEAK, 
        label: 'C5',
        description: 'Non-Peak Period',
        order: 5,
        isFlexible: false
    }
};

const isPeakPeriod = (period) => PEAK_PERIODS.includes(period);
const isNonPeakPeriod = (period) => NON_PEAK_PERIODS.includes(period);
const getPeriodType = (period) => PERIOD_METADATA[period]?.type;
const getPeriodLabel = (period) => PERIOD_LABELS[period];
const getPeriodMetadata = (period) => PERIOD_METADATA[period];

module.exports = {
    PEAK_PERIODS,
    NON_PEAK_PERIODS,
    ALL_PERIODS,
    PERIOD_LABELS,
    PERIOD_TYPES,
    PERIOD_METADATA,
    isPeakPeriod,
    isNonPeakPeriod,
    getPeriodType,
    getPeriodLabel,
    getPeriodMetadata
};