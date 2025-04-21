const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

class AllocationCalculatorService {
    constructor() {
        this.PEAK_PERIODS = ['c2', 'c3'];
        this.NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
        this.ALL_PERIODS = [...this.PEAK_PERIODS, ...this.NON_PEAK_PERIODS];
    }

    calculateAllocation(productionSites, bankingUnits, consumptionSites) {
        try {
            const allocations = [];
            const bankingAllocations = [];
            const lapseAllocations = [];

            // Process solar sites first (they can't bank)
            const solarSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'solar'
            );

            for (const site of solarSites) {
                const availableUnits = this.getAvailableUnits(site);
                if (this.hasAnyUnits(availableUnits)) {
                    const consumptionAllocations = this.allocateToConsumptionSites(
                        site,
                        availableUnits,
                        consumptionSites
                    );
                    allocations.push(...consumptionAllocations);

                    // Any remaining units go to lapse for solar
                    const remainingUnits = this.getRemainingUnits(availableUnits);
                    if (this.hasAnyUnits(remainingUnits)) {
                        lapseAllocations.push(this.createLapseAllocation(site, remainingUnits));
                    }
                }
            }

            // Then process wind sites (can bank)
            const windSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'wind'
            );

            for (const site of windSites) {
                const availableUnits = this.getAvailableUnits(site);
                if (this.hasAnyUnits(availableUnits)) {
                    const consumptionAllocations = this.allocateToConsumptionSites(
                        site,
                        availableUnits,
                        consumptionSites
                    );
                    allocations.push(...consumptionAllocations);

                    // Remaining units go to banking if enabled, otherwise lapse
                    const remainingUnits = this.getRemainingUnits(availableUnits);
                    if (this.hasAnyUnits(remainingUnits)) {
                        if (site.banking === 1) {
                            bankingAllocations.push(this.createBankingAllocation(site, remainingUnits));
                        } else {
                            lapseAllocations.push(this.createLapseAllocation(site, remainingUnits));
                        }
                    }
                }
            }

            // Return all allocations together
            return [
                ...allocations,
                ...bankingAllocations,
                ...lapseAllocations
            ];
        } catch (error) {
            logger.error('Allocation Calculator', 'Calculation Error', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    getAvailableUnits(site) {
        return {
            c1: Math.round(Number(site.c1 || 0)),
            c2: Math.round(Number(site.c2 || 0)),
            c3: Math.round(Number(site.c3 || 0)),
            c4: Math.round(Number(site.c4 || 0)),
            c5: Math.round(Number(site.c5 || 0))
        };
    }

    hasAnyUnits(units) {
        return Object.values(units).some(v => Math.round(Number(v)) > 0);
    }

    getRemainingUnits(units) {
        return Object.entries(units).reduce((acc, [key, value]) => {
            acc[key] = Math.round(Number(value));
            return acc;
        }, {});
    }

    allocateToConsumptionSites(productionSite, availableUnits, consumptionSites) {
        const allocations = [];
        const units = { ...availableUnits };

        for (const consumptionSite of consumptionSites) {
            const allocation = this.calculateSingleAllocation(
                productionSite,
                consumptionSite,
                units
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

    calculateSingleAllocation(productionSite, consumptionSite, availableUnits) {
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

        // Handle peak periods first
        for (const period of this.PEAK_PERIODS) {
            const available = Math.round(Number(availableUnits[period] || 0));
            const required = Math.round(Number(consumptionSite[period] || 0));

            if (available > 0 && required > 0) {
                const allocated = Math.min(available, required);
                if (allocated > 0) {
                    allocation.allocated[period] = allocated;
                    hasAllocation = true;
                }
            }
        }

        // Then handle non-peak periods
        for (const period of this.NON_PEAK_PERIODS) {
            const available = Math.round(Number(availableUnits[period] || 0));
            const required = Math.round(Number(consumptionSite[period] || 0));

            if (available > 0 && required > 0) {
                const allocated = Math.min(available, required);
                if (allocated > 0) {
                    allocation.allocated[period] = allocated;
                    hasAllocation = true;
                }
            }
        }

        return hasAllocation ? allocation : null;
    }

    createBankingAllocation(site, units) {
        return {
            productionSiteId: site.productionSiteId,
            productionSite: site.siteName,
            siteName: site.siteName,
            type: 'Banking',
            bankingEnabled: true,
            allocated: this.getRemainingUnits(units)
        };
    }

    createLapseAllocation(site, units) {
        return {
            productionSiteId: site.productionSiteId,
            productionSite: site.siteName,
            siteName: site.siteName,
            type: 'Lapse',
            allocated: this.getRemainingUnits(units)
        };
    }

    validateAllocation(allocation) {
        const errors = [];

        // Check if allocation has any units
        const hasUnits = this.hasAnyUnits(allocation.allocated);
        if (!hasUnits) {
            errors.push('Allocation must have at least one unit');
        }

        // Check mixing of peak and non-peak periods
        const hasPeak = this.PEAK_PERIODS.some(period => 
            Math.round(Number(allocation.allocated[period] || 0)) > 0
        );
        const hasNonPeak = this.NON_PEAK_PERIODS.some(period => 
            Math.round(Number(allocation.allocated[period] || 0)) > 0
        );

        if (hasPeak && hasNonPeak) {
            errors.push('Cannot mix peak and non-peak period allocations');
        }

        // Check for negative values
        for (const period of this.ALL_PERIODS) {
            const value = Math.round(Number(allocation.allocated[period] || 0));
            if (value < 0) {
                errors.push(`Period ${period} cannot have negative value`);
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join('. '));
        }
    }

    roundAllocatedValues(allocated) {
        if (!allocated) return {};
        
        return Object.entries(allocated).reduce((acc, [key, value]) => {
            acc[key] = Math.round(Number(value) || 0);
            return acc;
        }, {});
    }
}

module.exports = new AllocationCalculatorService();