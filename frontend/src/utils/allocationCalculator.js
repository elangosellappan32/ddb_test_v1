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
    
    // Process manual allocations first
    if (manualAllocations && Object.keys(manualAllocations).length > 0) {
        const updatedAllocations = new Map();
        
        Object.entries(manualAllocations).forEach(([key, value]) => {
            const [prodId, consId, period] = key.split('_');
            const prodUnit = prodUnits.find(u => u.productionSiteId === prodId);
            const consUnit = consUnits.find(u => u.consumptionSiteId === consId);
            
            if (prodUnit && consUnit) {
                // Update production unit's remaining
                const newValue = Number(value);
                prodUnit.remaining[period] = newValue;
                
                // Calculate difference for banking
                const prevValue = Number(manualAllocations[`${prodId}_${consId}_${period}`] || 0);
                const diff = newValue - prevValue;
                
                // Create unique key for this allocation
                const allocKey = `${prodId}_${consId}`;
                
                // If this allocation already exists, update it
                if (updatedAllocations.has(allocKey)) {
                    const existing = updatedAllocations.get(allocKey);
                    existing[period] = newValue;
                    existing.diff = diff;
                } else {
                    const allocation = {
                        productionSiteId: prodId,
                        consumptionSiteId: consId,
                        ...ALL_PERIODS.reduce((acc, p) => ({
                            ...acc,
                            [p]: 0
                        }), {}),
                        diff: diff,
                        bankingEnabled: prodUnit.bankingEnabled
                    };
                    allocation[period] = newValue;
                    updatedAllocations.set(allocKey, allocation);
                }
            }
        });

        // Process all updated allocations
        updatedAllocations.forEach(({ productionSiteId, consumptionSiteId, period, value, diff, bankingEnabled }) => {
            const prodUnit = prodUnits.find(u => u.productionSiteId === productionSiteId);
            const consUnit = consUnits.find(u => u.consumptionSiteId === consumptionSiteId);
            
            if (prodUnit && consUnit) {
                // Update production unit's remaining
                prodUnit.remaining[period] = value;
                
                // Handle banking only if it's a banking unit
                if (diff !== 0 && bankingEnabled) {
                    // Find banking allocation to update
                    let bankingAlloc = bankingAllocations.find(b => 
                        b.productionSiteId === productionSiteId && 
                        b.consumptionSiteId === consumptionSiteId && 
                        b.period === period
                    );
                    
                    if (bankingAlloc) {
                        bankingAlloc.amount += diff;
                    } else {
                        bankingAlloc = {
                            productionSiteId,
                            consumptionSiteId,
                            period,
                            amount: diff,
                            type: 'BANKING'
                        };
                        bankingAllocations.push(bankingAlloc);
                    }
                }

                // Find or create allocation for this combination
                let allocation = allocations.find(a => 
                    a.productionSiteId === productionSiteId && 
                    a.consumptionSiteId === consumptionSiteId
                );

                if (allocation) {
                    // Update existing allocation
                    allocation.allocated[period] = value;
                } else {
                    // Create new allocation
                    allocation = {
                        productionSiteId,
                        productionSite: prodUnit.productionSite,
                        consumptionSiteId,
                        consumptionSite: consUnit.consumptionSite,
                        allocated: ALL_PERIODS.reduce((acc, p) => ({
                            ...acc,
                            [p]: 0
                        }), {})
                    };
                    allocation.allocated[period] = value;
                    allocations.push(allocation);
                }
            }
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
            // Try direct allocation first
            consUnits.forEach(cons => {
                if (!hasRemainingNeeds(cons)) return;
                if (prod.month && cons.month && prod.month !== cons.month) return;

                const allocation = {
                    productionSiteId: prod.productionSiteId,
                    productionSite: prod.productionSite,
                    siteType: prod.type,
                    siteName: prod.siteName,
                    consumptionSiteId: cons.consumptionSiteId,
                    consumptionSite: cons.consumptionSite,
                    month: cons.month,
                    allocated: {}
                };

                let anyAlloc = false;
                ALL_PERIODS.forEach(period => {
                    if (cons.remaining[period] > 0 && prod.remaining[period] > 0) {
                        const allocated = Math.min(prod.remaining[period], cons.remaining[period]);
                        if (allocated > 0) {
                            allocation.allocated[period] = allocated;
                            prod.remaining[period] -= allocated;
                            cons.remaining[period] -= allocated;
                            anyAlloc = true;
                        }
                    }
                });

                if (anyAlloc) allocations.push(allocation);
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
                            const allocAmt = Math.min(prod.remaining.c3, needed);
                            const crossAlloc = {
                                productionSiteId: prod.productionSiteId,
                                productionSite: prod.productionSite,
                                siteType: prod.type,
                                siteName: prod.siteName,
                                consumptionSiteId: consCross.consumptionSiteId,
                                consumptionSite: consCross.consumptionSite,
                                month: consCross.month,
                                allocated: { [periodCross]: allocAmt }
                            };
                            allocations.push(crossAlloc);
                            prod.remaining.c3 -= allocAmt;
                            consCross.remaining[periodCross] -= allocAmt;
                        }
                    });
                });
            }

            // After direct allocation, handle remaining units
            if (hasRemainingAllocation(prod)) {
                // Create banking or lapse allocation from remaining units
                if (prod.bankingEnabled) {
                    // Create banking allocation for current month only
                    const bankingAlloc = {
                        productionSiteId: prod.productionSiteId,
                        productionSite: prod.productionSite || prod.siteName,
                        siteType: prod.type,
                        siteName: prod.siteName || prod.productionSite,
                        month: prod.month,
                        type: 'BANKING',
                        bankingEnabled: true,
                        allocated: { ...prod.remaining }
                    };
                    bankingAllocations.push(bankingAlloc);
                } else {
                    lapseAllocations.push({
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

    return { allocations, bankingAllocations, lapseAllocations };
}

export { ALL_PERIODS, PEAK_PERIODS, NON_PEAK_PERIODS };
