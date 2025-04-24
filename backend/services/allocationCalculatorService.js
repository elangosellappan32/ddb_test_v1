const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');
const { PEAK_PERIODS, NON_PEAK_PERIODS, ALL_PERIODS } = require('../constants/periods');

class AllocationCalculatorService {
    constructor() {
        this.PEAK_PERIODS = PEAK_PERIODS;
        this.NON_PEAK_PERIODS = NON_PEAK_PERIODS;
        this.ALL_PERIODS = ALL_PERIODS;
        this.BANKING_LIMIT = 0.3; // 30% banking limit
    }

    normalizeAllocatedValues(allocated = {}) {
        return this.ALL_PERIODS.reduce((acc, period) => {
            acc[period] = Math.round(Number(allocated[period] || 0));
            return acc;
        }, {});
    }

    calculateAllocation(productionSites, bankingUnits, consumptionSites) {
        try {
            const allocations = [];
            const bankingAllocations = [];
            const lapseAllocations = [];

            // First, calculate total consumption needs
            const consumptionNeeds = this.calculateConsumptionNeeds(consumptionSites);
            const sitePercentages = this.prepareSitePercentages(consumptionSites);

            // Process solar sites first (they can't bank)
            const solarSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'solar'
            );

            for (const site of solarSites) {
                const availableUnits = this.getAvailableUnits(site);
                if (this.hasAnyUnits(availableUnits)) {
                    const consumptionAllocations = this.allocateToConsumptionSites(
                        site, availableUnits, consumptionSites, sitePercentages, consumptionNeeds
                    );

                    allocations.push(...consumptionAllocations);
                    this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocations);

                    // Remaining units go to lapse
                    const remainingUnits = this.getRemainingUnits(availableUnits);
                    if (this.hasAnyUnits(remainingUnits)) {
                        lapseAllocations.push(this.createLapseAllocation(site, remainingUnits));
                    }
                }
            }

            // Process wind sites with banking
            const bankingWindSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'wind' && site.banking === 1
            );

            for (const site of bankingWindSites) {
                const availableUnits = this.getAvailableUnits(site);
                if (this.hasAnyUnits(availableUnits)) {
                    bankingAllocations.push(this.createBankingAllocation(site, availableUnits));
                }
            }

            // Process non-banking wind sites
            const nonBankingWindSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'wind' && site.banking !== 1
            );

            for (const site of nonBankingWindSites) {
                const availableUnits = this.getAvailableUnits(site);
                if (this.hasAnyUnits(availableUnits)) {
                    const consumptionAllocations = this.allocateToConsumptionSites(
                        site, availableUnits, consumptionSites, sitePercentages, consumptionNeeds
                    );

                    allocations.push(...consumptionAllocations);
                    this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocations);

                    const remainingUnits = this.getRemainingUnits(availableUnits);
                    if (this.hasAnyUnits(remainingUnits)) {
                        lapseAllocations.push(this.createLapseAllocation(site, remainingUnits));
                    }
                }
            }

            // Use banked units for remaining needs
            if (this.hasRemainingNeeds(consumptionNeeds)) {
                const usedBankingAllocations = [];

                for (const bankingAllocation of bankingAllocations) {
                    const availableUnits = this.normalizeAllocatedValues(bankingAllocation.allocated);
                    if (this.hasAnyUnits(availableUnits)) {
                        const consumptionAllocations = this.allocateToConsumptionSites(
                            { productionSiteId: bankingAllocation.productionSiteId, siteName: bankingAllocation.siteName },
                            availableUnits,
                            consumptionSites,
                            sitePercentages,
                            consumptionNeeds
                        );

                        if (consumptionAllocations.length > 0) {
                            allocations.push(...consumptionAllocations);
                            this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocations);
                            usedBankingAllocations.push(bankingAllocation);
                        }
                    }
                }

                // Remove used banking allocations
                usedBankingAllocations.forEach(allocation => {
                    const index = bankingAllocations.indexOf(allocation);
                    if (index !== -1) {
                        bankingAllocations.splice(index, 1);
                    }
                });
            }

            return [...allocations, ...bankingAllocations, ...lapseAllocations];
        } catch (error) {
            logger.error('Allocation Calculator Error:', error);
            throw error;
        }
    }

    calculateConsumptionNeeds(consumptionSites) {
        const needs = {};
        for (const site of consumptionSites) {
            needs[site.consumptionSiteId] = {
                siteName: site.siteName,
                peak: {},
                nonPeak: {},
                total: {
                    peak: 0,
                    nonPeak: 0
                }
            };

            // Calculate peak period needs
            for (const period of this.PEAK_PERIODS) {
                const amount = Math.round(Number(site[period] || 0));
                needs[site.consumptionSiteId].peak[period] = amount;
                needs[site.consumptionSiteId].total.peak += amount;
            }

            // Calculate non-peak period needs
            for (const period of this.NON_PEAK_PERIODS) {
                const amount = Math.round(Number(site[period] || 0));
                needs[site.consumptionSiteId].nonPeak[period] = amount;
                needs[site.consumptionSiteId].total.nonPeak += amount;
            }
        }
        return needs;
    }

    updateConsumptionNeeds(needs, allocations) {
        for (const allocation of allocations) {
            const siteNeeds = needs[allocation.consumptionSiteId];
            if (siteNeeds) {
                for (const period of this.PEAK_PERIODS) {
                    const allocated = Math.round(Number(allocation.allocated[period] || 0));
                    siteNeeds.peak[period] = Math.max(0, siteNeeds.peak[period] - allocated);
                    siteNeeds.total.peak = Math.max(0, siteNeeds.total.peak - allocated);
                }
                for (const period of this.NON_PEAK_PERIODS) {
                    const allocated = Math.round(Number(allocation.allocated[period] || 0));
                    siteNeeds.nonPeak[period] = Math.max(0, siteNeeds.nonPeak[period] - allocated);
                    siteNeeds.total.nonPeak = Math.max(0, siteNeeds.total.nonPeak - allocated);
                }
            }
        }
    }

    hasRemainingNeeds(needs) {
        return Object.values(needs).some(siteNeeds => 
            siteNeeds.total.peak > 0 || siteNeeds.total.nonPeak > 0
        );
    }

    allocateToConsumptionSites(productionSite, availableUnits, consumptionSites, sitePercentages, consumptionNeeds) {
        const allocations = [];
        const units = { ...availableUnits };

        // Sort consumption sites by their allocation percentage and remaining needs
        const sortedSites = [...consumptionSites].sort((a, b) => {
            const aNeeds = consumptionNeeds[a.consumptionSiteId];
            const bNeeds = consumptionNeeds[b.consumptionSiteId];
            const aPercentage = sitePercentages[a.siteName]?.percentage || 0;
            const bPercentage = sitePercentages[b.siteName]?.percentage || 0;
            
            // Prioritize sites with higher remaining needs and allocation percentage
            const aTotalNeeds = (aNeeds?.total.peak || 0) + (aNeeds?.total.nonPeak || 0);
            const bTotalNeeds = (bNeeds?.total.peak || 0) + (bNeeds?.total.nonPeak || 0);
            
            if (aTotalNeeds === 0 && bTotalNeeds === 0) return bPercentage - aPercentage;
            if (aTotalNeeds === 0) return 1;
            if (bTotalNeeds === 0) return -1;
            
            return bTotalNeeds * bPercentage - aTotalNeeds * aPercentage;
        });

        for (const consumptionSite of sortedSites) {
            const siteNeeds = consumptionNeeds[consumptionSite.consumptionSiteId];
            if (!siteNeeds || (siteNeeds.total.peak === 0 && siteNeeds.total.nonPeak === 0)) {
                continue;
            }

            const allocation = this.calculateSingleAllocation(
                productionSite,
                consumptionSite,
                units,
                sitePercentages[consumptionSite.siteName]?.percentage || 0,
                siteNeeds
            );

            if (allocation) {
                allocations.push(allocation);
                // Update remaining units
                for (const period of this.ALL_PERIODS) {
                    units[period] = Math.round(Number(units[period] || 0)) - 
                                  Math.round(Number(allocation.allocated[period] || 0));
                }
            }
        }

        return allocations;
    }

    calculateSingleAllocation(productionSite, consumptionSite, availableUnits, allocationPercentage, siteNeeds) {
        const allocation = {
            productionSiteId: productionSite.productionSiteId,
            productionSite: productionSite.siteName,
            siteName: productionSite.siteName,
            consumptionSiteId: consumptionSite.consumptionSiteId,
            consumptionSite: consumptionSite.siteName,
            type: 'Allocation',
            allocated: {}
        };

        let hasAllocation = false;

        // First try to satisfy peak period needs
        for (const period of this.PEAK_PERIODS) {
            const available = Math.round(Number(availableUnits[period] || 0));
            const required = Math.round(Number(siteNeeds.peak[period] || 0));

            if (available > 0 && required > 0) {
                const allocated = Math.min(available, required);
                if (allocated > 0) {
                    allocation.allocated[period] = allocated;
                    hasAllocation = true;
                }
            }
        }

        // Then try to use remaining peak units for non-peak needs (peak can be used for non-peak)
        const remainingPeakUnits = {};
        for (const period of this.PEAK_PERIODS) {
            remainingPeakUnits[period] = Math.round(Number(availableUnits[period] || 0)) - 
                                       Math.round(Number(allocation.allocated[period] || 0));
        }

        for (const period of this.NON_PEAK_PERIODS) {
            const required = Math.round(Number(siteNeeds.nonPeak[period] || 0));
            if (required > 0) {
                // First try to use non-peak units
                let allocated = 0;
                const availableNonPeak = Math.round(Number(availableUnits[period] || 0));
                
                if (availableNonPeak > 0) {
                    allocated = Math.min(availableNonPeak, required);
                    if (allocated > 0) {
                        allocation.allocated[period] = allocated;
                        hasAllocation = true;
                    }
                }

                // If still need more, try to use remaining peak units
                const remainingNeed = required - allocated;
                if (remainingNeed > 0) {
                    for (const peakPeriod of this.PEAK_PERIODS) {
                        const availablePeak = remainingPeakUnits[peakPeriod];
                        if (availablePeak > 0) {
                            const peakAllocation = Math.min(availablePeak, remainingNeed);
                            if (peakAllocation > 0) {
                                allocation.allocated[period] = (allocation.allocated[period] || 0) + peakAllocation;
                                remainingPeakUnits[peakPeriod] -= peakAllocation;
                                hasAllocation = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return hasAllocation ? allocation : null;
    }

    getSavedAllocationData() {
        try {
            const savedData = localStorage.getItem('allocationPercentages');
            return savedData ? JSON.parse(savedData) : [];
        } catch (error) {
            logger.error('[AllocationCalculatorService] Error reading allocation data:', error);
            return [];
        }
    }

    getAvailableUnits(site) {
        return this.normalizeAllocatedValues({
            c1: site.c1,
            c2: site.c2,
            c3: site.c3,
            c4: site.c4,
            c5: site.c5
        });
    }

    hasAnyUnits(units) {
        return Object.values(units).some(v => Math.round(Number(v)) > 0);
    }

    getRemainingUnits(units) {
        return this.normalizeAllocatedValues(units);
    }

    createBankingAllocation(site, units) {
        return {
            productionSiteId: site.productionSiteId,
            productionSite: site.siteName,
            siteName: site.siteName,
            type: 'Banking',
            bankingEnabled: true,
            allocated: this.normalizeAllocatedValues(units)
        };
    }

    createLapseAllocation(site, units) {
        return {
            productionSiteId: site.productionSiteId,
            productionSite: site.siteName,
            siteName: site.siteName,
            type: 'Lapse',
            allocated: this.normalizeAllocatedValues(units)
        };
    }

    validateAllocation(allocation) {
        if (!allocation?.allocated) {
            throw new ValidationError('Allocation data is required');
        }

        const normalizedAllocated = this.normalizeAllocatedValues(allocation.allocated);
        const errors = [];

        // Validate values
        Object.entries(normalizedAllocated).forEach(([period, value]) => {
            if (value < 0) {
                errors.push(`Period ${period} cannot have negative value`);
            }
        });

        if (errors.length > 0) {
            throw new ValidationError(errors.join('. '));
        }

        return {
            ...allocation,
            allocated: normalizedAllocated
        };
    }

    calculateAllocation(productionUnits, consumptionUnits, options = {}) {
        const { minThreshold = 0 } = options;

        try {
            // Normalize input values
            const normalizedProduction = this.normalizeUnits(productionUnits);
            const normalizedConsumption = this.normalizeUnits(consumptionUnits);

            // Initialize result structure
            const result = {
                allocated: {},
                remainingProduction: { ...normalizedProduction },
                remainingConsumption: { ...normalizedConsumption },
                totalAllocated: 0,
                totalRemaining: 0
            };

            // First handle peak periods
            PEAK_PERIODS.forEach(period => {
                const allocated = this.calculatePeriodAllocation(
                    normalizedProduction[period],
                    normalizedConsumption[period],
                    minThreshold
                );
                
                if (allocated > 0) {
                    result.allocated[period] = allocated;
                    result.remainingProduction[period] -= allocated;
                    result.remainingConsumption[period] -= allocated;
                    result.totalAllocated += allocated;
                }
            });

            // Then handle non-peak periods
            NON_PEAK_PERIODS.forEach(period => {
                const allocated = this.calculatePeriodAllocation(
                    normalizedProduction[period],
                    normalizedConsumption[period],
                    minThreshold
                );
                
                if (allocated > 0) {
                    result.allocated[period] = allocated;
                    result.remainingProduction[period] -= allocated;
                    result.remainingConsumption[period] -= allocated;
                    result.totalAllocated += allocated;
                }
            });

            // Calculate total remaining
            result.totalRemaining = ALL_PERIODS.reduce(
                (sum, period) => sum + result.remainingProduction[period],
                0
            );

            return result;

        } catch (error) {
            logger.error('[AllocationCalculator] Calculation Error:', error);
            throw error;
        }
    }

    calculatePeriodAllocation(production, consumption, minThreshold) {
        if (!production || !consumption) return 0;
        
        const available = Math.max(0, Math.round(Number(production)));
        const required = Math.max(0, Math.round(Number(consumption)));
        
        if (available < minThreshold || required < minThreshold) return 0;
        
        return Math.min(available, required);
    }

    calculateBankingAllocation(remainingUnits, currentBankingTotal = 0) {
        const result = {
            bankable: {},
            lapse: {},
            totalBankable: 0,
            totalLapse: 0
        };

        try {
            ALL_PERIODS.forEach(period => {
                const remaining = Math.max(0, Math.round(Number(remainingUnits[period] || 0)));
                if (remaining > 0) {
                    // Calculate bankable amount based on banking limit
                    const bankableAmount = Math.floor(remaining * this.BANKING_LIMIT);
                    const lapseAmount = remaining - bankableAmount;

                    if (bankableAmount > 0) {
                        result.bankable[period] = bankableAmount;
                        result.totalBankable += bankableAmount;
                    }

                    if (lapseAmount > 0) {
                        result.lapse[period] = lapseAmount;
                        result.totalLapse += lapseAmount;
                    }
                }
            });

            return result;

        } catch (error) {
            logger.error('[AllocationCalculator] Banking Calculation Error:', error);
            throw error;
        }
    }

    calculateLapseAllocation(remainingUnits) {
        return {
            lapse: this.normalizeUnits(remainingUnits),
            totalLapse: ALL_PERIODS.reduce(
                (sum, period) => sum + Math.max(0, Math.round(Number(remainingUnits[period] || 0))),
                0
            )
        };
    }

    normalizeUnits(units = {}) {
        return ALL_PERIODS.reduce((acc, period) => {
            acc[period] = Math.max(0, Math.round(Number(units[period] || 0)));
            return acc;
        }, {});
    }
}

const calculateBankingAllocation = (site, availableUnits) => {
    if (!site?.productionSiteId || !availableUnits) {
        throw new Error('Invalid inputs for banking calculation');
    }

    // Ensure production site ID exists and is formatted correctly
    const productionSiteId = site.productionSiteId?.toString();
    if (!productionSiteId) {
        throw new Error('Production site ID is required for banking calculation');
    }

    // Transform and validate unit values
    const sanitizedUnits = {};
    ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(period => {
        sanitizedUnits[period] = Math.max(0, Math.round(Number(availableUnits[period] || 0)));
    });

    // Calculate total units
    const totalUnits = Object.values(sanitizedUnits).reduce((sum, val) => sum + val, 0);

    return {
        productionSiteId,
        siteName: site.siteName?.trim() || '',
        type: 'Banking',
        bankingEnabled: true,
        version: 1,
        allocated: sanitizedUnits,
        total: totalUnits
    };
};

const validateBankingData = (data) => {
    if (!data) return { isValid: false, errors: ['Banking data is required'] };

    const errors = [];

    if (!data.productionSiteId?.toString()) {
        errors.push('Production site ID is required');
    }

    if (!data.allocated || typeof data.allocated !== 'object') {
        errors.push('Allocated units data is required');
    } else {
        Object.entries(data.allocated).forEach(([period, value]) => {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 0) {
                errors.push(`Invalid value for period ${period}: ${value}`);
            }
        });
    }

    const hasAllocation = data.allocated && 
        Object.values(data.allocated).some(val => Number(val) > 0);

    if (!hasAllocation) {
        errors.push('At least one period must have allocated units');
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? {
            ...data,
            productionSiteId: data.productionSiteId.toString(),
            allocated: Object.entries(data.allocated || {}).reduce((acc, [key, value]) => {
                acc[key] = Math.max(0, Math.round(Number(value) || 0));
                return acc;
            }, {}),
            version: Number(data.version || 1)
        } : null
    };
};

const processAllocationSplit = (productionSite, consumptionSites, availableUnits) => {
    if (!productionSite?.productionSiteId) {
        throw new Error('Invalid production site data');
    }

    const sanitizedAvailable = {};
    Object.entries(availableUnits || {}).forEach(([period, value]) => {
        sanitizedAvailable[period] = Math.max(0, Math.round(Number(value || 0)));
    });

    let remainingUnits = { ...sanitizedAvailable };
    const allocations = [];

    // Process consumption site allocations
    consumptionSites.forEach(site => {
        if (!site?.consumptionSiteId) return;

        const allocation = {
            productionSiteId: productionSite.productionSiteId.toString(),
            consumptionSiteId: site.consumptionSiteId.toString(),
            allocated: {}
        };

        let hasAllocation = false;
        Object.entries(remainingUnits).forEach(([period, available]) => {
            const required = Math.max(0, Math.round(Number(site[period] || 0)));
            if (available > 0 && required > 0) {
                const allocated = Math.min(available, required);
                if (allocated > 0) {
                    allocation.allocated[period] = allocated;
                    remainingUnits[period] -= allocated;
                    hasAllocation = true;
                }
            }
        });

        if (hasAllocation) {
            allocations.push(allocation);
        }
    });

    // Handle remaining units based on site type
    const hasRemainingUnits = Object.values(remainingUnits).some(val => val > 0);
    if (hasRemainingUnits) {
        if (productionSite.type?.toLowerCase() === 'wind' && productionSite.banking === 1) {
            allocations.push({
                productionSiteId: productionSite.productionSiteId.toString(),
                type: 'Banking',
                bankingEnabled: true,
                allocated: remainingUnits
            });
        } else {
            allocations.push({
                productionSiteId: productionSite.productionSiteId.toString(),
                type: 'Lapse',
                allocated: remainingUnits
            });
        }
    }

    return allocations;
};

module.exports = {
    calculateBankingAllocation,
    validateBankingData,
    processAllocationSplit
};

module.exports = new AllocationCalculatorService();