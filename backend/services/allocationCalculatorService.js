const PERIODS = require('../constants/periods');
const logger = require('../utils/logger');

class AllocationCalculatorService {
    constructor() {
        this.PEAK_PERIODS = PERIODS.PEAK;
        this.NON_PEAK_PERIODS = PERIODS.NON_PEAK;
        this.ALL_PERIODS = PERIODS.ALL;
    }

    calculateAllocation(productionSites, bankingUnits, consumptionSites) {
        try {
            const allocations = [];
            const bankingAllocations = [];
            const lapseAllocations = [];
            const companyId = '1';

            // Calculate initial consumption needs
            const consumptionNeeds = this.calculateConsumptionNeeds(consumptionSites);
            const sitePercentages = this.prepareSitePercentages(consumptionSites);

            // 1. First process solar sites (no banking allowed)
            const solarSites = productionSites.filter(site => site.type?.toLowerCase() === 'solar');
            this.processSolarSites(solarSites, consumptionNeeds, sitePercentages, allocations, lapseAllocations, companyId);

            // 2. Process wind sites with banking enabled
            const bankingWindSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'wind' && site.banking === 1
            );
            
            // Handle banking sites
            for (const site of bankingWindSites) {
                const availableUnits = this.getAvailableUnits(site);
                if (this.hasAnyUnits(availableUnits)) {
                    // Find existing banking for this site
                    const existingBanking = bankingUnits?.find(b => b.productionSiteId === site.productionSiteId);
                    
                    // First try to use units for direct allocation
                    const consumptionAllocs = this.allocateToConsumptionSites(
                        site, availableUnits, consumptionSites, sitePercentages, consumptionNeeds, companyId
                    );

                    if (consumptionAllocs.length > 0) {
                        allocations.push(...consumptionAllocs);
                        this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocs);
                    }

                    // Bank remaining units
                    const remainingUnits = this.getRemainingUnits(availableUnits);
                    if (this.hasAnyUnits(remainingUnits)) {
                        const bankingAlloc = this.createBankingAllocation(
                            site, 
                            remainingUnits,
                            existingBanking,
                            companyId
                        );
                        bankingAllocations.push(bankingAlloc);
                    }
                }
            }

            // 3. Process regular wind sites (no banking)
            const nonBankingWindSites = productionSites.filter(site => 
                site.type?.toLowerCase() === 'wind' && site.banking !== 1
            );
            this.processNonBankingSites(nonBankingWindSites, consumptionNeeds, sitePercentages, allocations, lapseAllocations, companyId);

            // 4. Use banked units for remaining needs
            if (this.hasRemainingNeeds(consumptionNeeds) && bankingAllocations.length > 0) {
                this.processBankedUnits(bankingAllocations, consumptionNeeds, sitePercentages, consumptionSites, allocations, companyId);
            }

            return {
                allocations,
                bankingAllocations,
                lapseAllocations
            };
        } catch (error) {
            logger.error('Allocation Calculator Error:', error);
            throw error;
        }
    }

    createBankingAllocation(site, units, existingBanking, companyId = '1') {
        const normalizedUnits = this.normalizeAllocatedValues(units);
        const previousBalance = existingBanking || {};
        
        // Calculate net banking
        const bankingUnits = {};
        this.ALL_PERIODS.forEach(period => {
            const currentUnits = Number(normalizedUnits[period] || 0);
            const existingUnits = Number(previousBalance[period] || 0);
            bankingUnits[period] = currentUnits + existingUnits; // Accumulate banking
        });

        return {
            productionSiteId: site.productionSiteId,
            productionSiteName: site.siteName,
            pk: `${companyId}_${site.productionSiteId}`,
            allocated: bankingUnits,
            previousBalance: previousBalance,
            type: 'BANKING',
            bankingEnabled: true
        };
    }

    normalizeAllocatedValues(allocated = {}) {
        return this.ALL_PERIODS.reduce((acc, period) => {
            acc[period] = Math.round(Number(allocated[period] || 0));
            return acc;
        }, {});
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
                for (const period of this.ALL_PERIODS) {
                    const allocated = Math.round(Number(allocation.allocated[period] || 0));
                    if (this.PEAK_PERIODS.includes(period)) {
                        siteNeeds.peak[period] = Math.max(0, siteNeeds.peak[period] - allocated);
                        siteNeeds.total.peak = Math.max(0, siteNeeds.total.peak - allocated);
                    } else {
                        siteNeeds.nonPeak[period] = Math.max(0, siteNeeds.nonPeak[period] - allocated);
                        siteNeeds.total.nonPeak = Math.max(0, siteNeeds.total.nonPeak - allocated);
                    }
                }
            }
        }
    }

    allocateToConsumptionSites(productionSite, availableUnits, consumptionSites, sitePercentages, consumptionNeeds, companyId = '1') {
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
                siteNeeds,
                companyId
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

    calculateSingleAllocation(productionSite, consumptionSite, availableUnits, allocationPercentage, siteNeeds, companyId = '1') {
        const allocation = {
            productionSiteId: productionSite.productionSiteId,
            consumptionSiteId: consumptionSite.consumptionSiteId,
            pk: this.generatePK(companyId, productionSite.productionSiteId, consumptionSite.consumptionSiteId),
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

    generatePK(companyId, productionSiteId, consumptionSiteId) {
        return `${companyId}_${productionSiteId}_${consumptionSiteId}`;
    }

    prepareSitePercentages(consumptionSites) {
        const total = consumptionSites.reduce((sum, site) => sum + calculateTotal(site), 0);
        return consumptionSites.reduce((acc, site) => {
            acc[site.siteName] = {
                percentage: total > 0 ? (calculateTotal(site) / total) * 100 : 0
            };
            return acc;
        }, {});
    }

    hasRemainingNeeds(needs) {
        return Object.values(needs).some(siteNeeds => 
            siteNeeds.total.peak > 0 || siteNeeds.total.nonPeak > 0
        );
    }

    getAvailableUnits(site) {
        return this.ALL_PERIODS.reduce((acc, period) => {
            acc[period] = Math.round(Number(site[period] || 0));
            return acc;
        }, {});
    }

    hasAnyUnits(units) {
        return this.ALL_PERIODS.some(period => Math.round(Number(units[period] || 0)) > 0);
    }

    getRemainingUnits(units) {
        return this.ALL_PERIODS.reduce((acc, period) => {
            acc[period] = Math.round(Number(units[period] || 0));
            return acc;
        }, {});
    }

    processSolarSites(solarSites, consumptionNeeds, sitePercentages, allocations, lapseAllocations, companyId) {
        for (const site of solarSites) {
            const availableUnits = this.getAvailableUnits(site);
            if (this.hasAnyUnits(availableUnits)) {
                const consumptionAllocs = this.allocateToConsumptionSites(
                    site, availableUnits, consumptionSites, sitePercentages, consumptionNeeds, companyId
                );

                allocations.push(...consumptionAllocs);
                this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocs);

                const remainingUnits = this.getRemainingUnits(availableUnits);
                if (this.hasAnyUnits(remainingUnits)) {
                    lapseAllocations.push(this.createLapseAllocation(site, remainingUnits, companyId));
                }
            }
        }
    }

    processNonBankingSites(nonBankingWindSites, consumptionNeeds, sitePercentages, allocations, lapseAllocations, companyId) {
        for (const site of nonBankingWindSites) {
            const availableUnits = this.getAvailableUnits(site);
            if (this.hasAnyUnits(availableUnits)) {
                const consumptionAllocs = this.allocateToConsumptionSites(
                    site, availableUnits, consumptionSites, sitePercentages, consumptionNeeds, companyId
                );

                allocations.push(...consumptionAllocs);
                this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocs);

                const remainingUnits = this.getRemainingUnits(availableUnits);
                if (this.hasAnyUnits(remainingUnits)) {
                    lapseAllocations.push(this.createLapseAllocation(site, remainingUnits, companyId));
                }
            }
        }
    }

    processBankedUnits(bankingAllocations, consumptionNeeds, sitePercentages, consumptionSites, allocations, companyId) {
        for (const bankingAllocation of bankingAllocations) {
            const availableUnits = this.normalizeAllocatedValues(bankingAllocation.allocated);
            if (this.hasAnyUnits(availableUnits)) {
                const consumptionAllocs = this.allocateToConsumptionSites(
                    { productionSiteId: bankingAllocation.productionSiteId, siteName: bankingAllocation.siteName },
                    availableUnits,
                    consumptionSites,
                    sitePercentages,
                    consumptionNeeds,
                    companyId
                );

                if (consumptionAllocs.length > 0) {
                    allocations.push(...consumptionAllocs);
                    this.updateConsumptionNeeds(consumptionNeeds, consumptionAllocs);
                }
            }
        }
    }
}

module.exports = new AllocationCalculatorService();