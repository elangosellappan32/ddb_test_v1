const PEAK_PERIODS = ['c2', 'c3'];
const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];
const ALL_PERIODS = [...PEAK_PERIODS, ...NON_PEAK_PERIODS];

export const calculateAllocation = (productionData, consumptionData, bankingData) => {
    const allocations = [];

    // Process solar sites first (they can't bank)
    const solarSites = productionData.filter(site => 
        site.type?.toLowerCase() === 'solar'
    );

    // Process solar allocations
    solarSites.forEach(site => {
        const availableUnits = getAvailableUnits(site);
        processAllocation(site, availableUnits, consumptionData, false, allocations);
    });

    // Process wind sites (can bank)
    const windSites = productionData.filter(site => 
        site.type?.toLowerCase() === 'wind'
    );

    windSites.forEach(site => {
        const availableUnits = getAvailableUnits(site);
        processAllocation(site, availableUnits, consumptionData, site.banking === 1, allocations);
    });

    return allocations;
};

const getAvailableUnits = (site) => {
    return ALL_PERIODS.reduce((acc, period) => {
        acc[period] = Math.round(Number(site[period] || 0));
        return acc;
    }, {});
};

const processAllocation = (site, availableUnits, consumptionData, canBank, allocations) => {
    // Allocate to consumption sites
    consumptionData.forEach(consumptionSite => {
        const allocation = createAllocation(site, consumptionSite, availableUnits);
        if (allocation) {
            allocations.push(allocation);
            updateAvailableUnits(availableUnits, allocation.allocated);
        }
    });

    // Handle remaining units
    const remainingUnits = Object.values(availableUnits).reduce((sum, val) => sum + val, 0);
    if (remainingUnits > 0) {
        if (canBank) {
            allocations.push(createBankingAllocation(site, availableUnits));
        } else {
            allocations.push(createLapseAllocation(site, availableUnits));
        }
    }
};

const createAllocation = (productionSite, consumptionSite, availableUnits) => {
    if (!productionSite?.productionSiteId || !consumptionSite?.consumptionSiteId) {
        return null;
    }

    const allocation = {
        productionSiteId: productionSite.productionSiteId,
        productionSite: productionSite.siteName,
        siteName: productionSite.siteName,
        consumptionSiteId: consumptionSite.consumptionSiteId,
        consumptionSite: consumptionSite.siteName,
        type: productionSite.banking === 1 ? 'Banking' : 'Allocation',
        siteType: productionSite.type || 'Unknown',
        isDirect: productionSite.type?.toLowerCase() === 'solar',
        allocated: {}
    };

    let hasAllocation = false;

    // Handle peak periods first
    for (const period of PEAK_PERIODS) {
        const available = Math.round(availableUnits[period]);
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
    for (const period of NON_PEAK_PERIODS) {
        const available = Math.round(availableUnits[period]);
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
};

const updateAvailableUnits = (availableUnits, allocated) => {
    if (!allocated) return;
    ALL_PERIODS.forEach(period => {
        availableUnits[period] = Math.round(availableUnits[period] || 0) - Math.round(allocated[period] || 0);
    });
};

const createBankingAllocation = (site, availableUnits) => {
    if (!site?.productionSiteId || !site?.siteName) {
        throw new Error('Invalid production site data for banking allocation');
    }

    const sanitizedUnits = {};
    ALL_PERIODS.forEach(period => {
        sanitizedUnits[period] = Math.max(0, Math.round(Number(availableUnits[period] || 0)));
    });

    return {
        productionSiteId: site.productionSiteId.toString(),
        productionSite: site.siteName,
        siteName: site.siteName,
        type: 'Banking',
        bankingEnabled: true,
        allocated: sanitizedUnits
    };
};

const createLapseAllocation = (site, availableUnits) => {
    if (!site?.productionSiteId || !site?.siteName) {
        throw new Error('Invalid production site data for lapse allocation');
    }

    const sanitizedUnits = {};
    ALL_PERIODS.forEach(period => {
        sanitizedUnits[period] = Math.max(0, Math.round(Number(availableUnits[period] || 0)));
    });

    return {
        productionSiteId: site.productionSiteId.toString(),
        productionSite: site.siteName,
        siteName: site.siteName,
        type: 'Lapse',
        allocated: sanitizedUnits
    };
};
