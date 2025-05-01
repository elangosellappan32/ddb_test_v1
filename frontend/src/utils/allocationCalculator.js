// Allocation Calculator
const ALL_PERIODS = ['c1', 'c2', 'c3', 'c4', 'c5'];
const PEAK_PERIODS = ['c2', 'c3'];
const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];

export function calculateAllocations({ productionUnits, consumptionUnits, bankingUnits, manualAllocations = {} }) {
    console.group('🔄 Running Allocation Calculation');
    
    // Deep copy units with remaining and handle banking
    const prodUnits = (productionUnits || []).map(u => ({
        productionSiteId: u.productionSiteId || u.id,
        productionSite: u.productionSite || u.siteName,
        siteName: u.siteName,
        month: u.month,
        type: (u.type || '').toUpperCase(),
        bankingEnabled: u.banking === 1,
        remaining: ALL_PERIODS.reduce((acc, period) => ({
            ...acc,
            [period]: Number(u[period] || 0)
        }), {})
    }));

    const consUnits = (consumptionUnits || []).map(u => ({
        consumptionSiteId: u.consumptionSiteId || u.id,
        consumptionSite: u.consumptionSite || u.siteName,
        siteName: u.siteName,
        month: u.month,
        remaining: ALL_PERIODS.reduce((acc, period) => ({
            ...acc,
            [period]: Number(u[period] || 0)
        }), {})
    }));

    const solarUnits = prodUnits.filter(u => u.type === 'SOLAR');
    const windUnits = prodUnits.filter(u => u.type === 'WIND' && !u.bankingEnabled);
    const bankingWindUnits = prodUnits.filter(u => u.type === 'WIND' && u.bankingEnabled);

    const allocations = [];
    const bankingAllocations = [];
    const lapseAllocations = [];

    // --- Capture initial banking/lapse tables before manual allocations ---
    const initialBankingAllocations = [];
    const initialLapseAllocations = [];
    // We'll simulate what the tables would be without manual allocations
    [solarUnits, windUnits, bankingWindUnits].forEach((group) => {
        group.forEach(prod => {
            if (Object.values(prod.remaining).some(val => val > 0)) {
                if (prod.bankingEnabled) {
                    initialBankingAllocations.push({
                        productionSiteId: prod.productionSiteId,
                        productionSite: prod.productionSite || prod.siteName,
                        siteType: prod.type,
                        siteName: prod.siteName || prod.productionSite,
                        month: prod.month,
                        type: 'BANKING',
                        bankingEnabled: true,
                        allocated: { ...prod.remaining }
                    });
                } else {
                    initialLapseAllocations.push({
                        productionSiteId: prod.productionSiteId,
                        productionSite: prod.productionSite || prod.siteName,
                        siteType: prod.type,
                        siteName: prod.siteName || prod.productionSite,
                        month: prod.month,
                        type: 'LAPSE',
                        allocated: { ...prod.remaining }
                    });
                }
            }
        });
    });
    // --- End initial capture ---
    
    // Process manual allocations first
    if (manualAllocations && Object.keys(manualAllocations).length > 0) {
        Object.entries(manualAllocations).forEach(([key, value]) => {
            const [prodId, consId, period] = key.split('_');
            const prodUnit = prodUnits.find(u => u.productionSiteId === prodId);
            if (!prodUnit) return;
            prodUnit.remaining[period] = Number(value);
        });
    }

    // Helper to check if a unit has any remaining allocation in any period
    const hasRemainingAllocation = (unit) => 
        Object.values(unit.remaining).some(val => val > 0);

    // Helper to check if consumption site has remaining needs
    const hasRemainingNeeds = (unit) =>
        Object.values(unit.remaining).some(val => val > 0);

    // Process all production unit groups
    [solarUnits, windUnits, bankingWindUnits].forEach((group, index) => {
        console.group(`Processing ${index === 0 ? 'Solar' : index === 1 ? 'Wind' : 'Banking Wind'} Units`);
        
        group.forEach(prod => {
            consUnits.forEach(cons => {
                if (!hasRemainingNeeds(cons)) return;
                if (prod.month && cons.month && prod.month !== cons.month) return;

                // Find or create allocation for this combination
                let allocation = allocations.find(a =>
                    a.productionSiteId === prod.productionSiteId &&
                    a.consumptionSiteId === cons.consumptionSiteId
                );
                if (!allocation) {
                    allocation = {
                        productionSiteId: prod.productionSiteId,
                        productionSite: prod.productionSite,
                        siteType: prod.type,
                        siteName: prod.siteName,
                        consumptionSiteId: cons.consumptionSiteId,
                        consumptionSite: cons.consumptionSite,
                        month: cons.month,
                        allocated: {}
                    };
                    allocations.push(allocation);
                }

                ALL_PERIODS.forEach(period => {
                    if (cons.remaining[period] > 0 && prod.remaining[period] > 0) {
                        const allocated = Math.min(prod.remaining[period], cons.remaining[period]);
                        if (allocated > 0) {
                            allocation.allocated[period] = (allocation.allocated[period] || 0) + allocated;
                            prod.remaining[period] -= allocated;
                            cons.remaining[period] -= allocated;
                        }
                    }
                });
            });

            // Cross-allocation from peak period (c3) to other periods
            if (prod.remaining.c3 > 0) {
                consUnits.forEach(consCross => {
                    if (!hasRemainingNeeds(consCross)) return;
                    if (prod.month && consCross.month && prod.month !== consCross.month) return;
                    ALL_PERIODS.forEach(periodCross => {
                        if (periodCross === 'c3') return;
                        const needed = Number(consCross.remaining[periodCross] || 0);
                        if (needed > 0 && prod.remaining.c3 > 0) {
                            // Find or create allocation for this combination
                            let allocation = allocations.find(a =>
                                a.productionSiteId === prod.productionSiteId &&
                                a.consumptionSiteId === consCross.consumptionSiteId
                            );
                            if (!allocation) {
                                allocation = {
                                    productionSiteId: prod.productionSiteId,
                                    productionSite: prod.productionSite,
                                    siteType: prod.type,
                                    siteName: prod.siteName,
                                    consumptionSiteId: consCross.consumptionSiteId,
                                    consumptionSite: consCross.consumptionSite,
                                    month: consCross.month,
                                    allocated: {}
                                };
                                allocations.push(allocation);
                            }
                            const allocAmt = Math.min(prod.remaining.c3, needed);
                            allocation.allocated[periodCross] = (allocation.allocated[periodCross] || 0) + allocAmt;
                            prod.remaining.c3 -= allocAmt;
                            consCross.remaining[periodCross] -= allocAmt;
                        }
                    });
                });
            }

            // After direct allocation, handle remaining units
            if (hasRemainingAllocation(prod)) {
                // Create or update banking/lapse allocation for each period separately
                ALL_PERIODS.forEach(period => {
                    const remaining = prod.remaining[period];
                    if (remaining > 0) {
                        if (prod.bankingEnabled) {
                            // Find or create banking allocation for this site
                            let bankingAlloc = bankingAllocations.find(b => b.productionSiteId === prod.productionSiteId);
                            if (!bankingAlloc) {
                                bankingAlloc = {
                                    productionSiteId: prod.productionSiteId,
                                    productionSite: prod.productionSite || prod.siteName,
                                    siteType: prod.type,
                                    siteName: prod.siteName || prod.productionSite,
                                    month: prod.month,
                                    type: 'BANKING',
                                    bankingEnabled: true,
                                    allocated: {}
                                };
                                bankingAllocations.push(bankingAlloc);
                            }
                            bankingAlloc.allocated[period] = (bankingAlloc.allocated[period] || 0) + remaining;
                        } else {
                            // Find or create lapse allocation for this site
                            let lapseAlloc = lapseAllocations.find(l => l.productionSiteId === prod.productionSiteId);
                            if (!lapseAlloc) {
                                lapseAlloc = {
                                    productionSiteId: prod.productionSiteId,
                                    productionSite: prod.productionSite || prod.siteName,
                                    siteType: prod.type,
                                    siteName: prod.siteName || prod.productionSite,
                                    month: prod.month,
                                    type: 'LAPSE',
                                    allocated: {}
                                };
                                lapseAllocations.push(lapseAlloc);
                            }
                            lapseAlloc.allocated[period] = (lapseAlloc.allocated[period] || 0) + remaining;
                        }
                        prod.remaining[period] = 0;
                    }
                });
            }
        });
    });

    // Try to use banked units for remaining consumption needs
    if (bankingAllocations.length > 0) {
        consUnits.forEach(cons => {
            if (!hasRemainingNeeds(cons)) return;
            
            bankingAllocations.forEach(bank => {
                ALL_PERIODS.forEach(period => {
                    const needed = Number(cons.remaining[period] || 0);
                    const bankAvailable = Number(bank.allocated[period] || 0);
                    
                    if (bankAvailable > 0 && needed > 0) {
                        const allocated = Math.min(bankAvailable, needed);
                        if (allocated > 0) {
                            // Create negative banking entry for used units
                            const bankingUsedAlloc = {
                                productionSiteId: bank.productionSiteId,
                                productionSite: bank.productionSite,
                                siteType: 'BANKING',
                                siteName: bank.siteName,
                                month: cons.month,
                                type: 'BANKING',
                                bankingEnabled: true,
                                allocated: { [period]: -allocated }
                            };
                            bankingAllocations.push(bankingUsedAlloc);

                            // Create allocation from banking to consumption
                            allocations.push({
                                productionSiteId: bank.productionSiteId,
                                productionSite: bank.productionSite,
                                siteType: 'BANKING',
                                siteName: bank.siteName,
                                consumptionSiteId: cons.consumptionSiteId,
                                consumptionSite: cons.consumptionSite,
                                month: cons.month,
                                type: 'ALLOCATION',
                                allocated: { [period]: allocated }
                            });

                            bank.allocated[period] -= allocated;
                            cons.remaining[period] -= allocated;
                        }
                    }
                });
            });
        });
    }

    // After all allocations, set banking/lapse for all periods to the true remaining units
    prodUnits.forEach(prod => {
        ALL_PERIODS.forEach(period => {
            const remaining = prod.remaining[period];
            if (remaining > 0) {
                if (prod.bankingEnabled) {
                    let bankingAlloc = bankingAllocations.find(b => b.productionSiteId === prod.productionSiteId);
                    if (!bankingAlloc) {
                        bankingAlloc = {
                            productionSiteId: prod.productionSiteId,
                            productionSite: prod.productionSite || prod.siteName,
                            siteType: prod.type,
                            siteName: prod.siteName || prod.productionSite,
                            month: prod.month,
                            type: 'BANKING',
                            bankingEnabled: true,
                            allocated: {}
                        };
                        bankingAllocations.push(bankingAlloc);
                    }
                    bankingAlloc.allocated[period] = (bankingAlloc.allocated[period] || 0) + remaining;
                } else {
                    let lapseAlloc = lapseAllocations.find(l => l.productionSiteId === prod.productionSiteId);
                    if (!lapseAlloc) {
                        lapseAlloc = {
                            productionSiteId: prod.productionSiteId,
                            productionSite: prod.productionSite || prod.siteName,
                            siteType: prod.type,
                            siteName: prod.siteName || prod.productionSite,
                            month: prod.month,
                            type: 'LAPSE',
                            allocated: {}
                        };
                        lapseAllocations.push(lapseAlloc);
                    }
                    lapseAlloc.allocated[period] = (lapseAlloc.allocated[period] || 0) + remaining;
                }
            }
        });
    });

    return { 
        allocations, 
        bankingAllocations, 
        lapseAllocations, 
        initialBankingAllocations, 
        initialLapseAllocations 
    };
}

export { ALL_PERIODS, PEAK_PERIODS, NON_PEAK_PERIODS };
