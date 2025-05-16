// Allocation Calculator
const ALL_PERIODS = ['c1', 'c2', 'c3', 'c4', 'c5'];
const PEAK_PERIODS = ['c2', 'c3'];
const NON_PEAK_PERIODS = ['c1', 'c4', 'c5'];

/**
 * Creates a deep copy of a unit with remaining values
 */
function createUnitWithRemaining(unit, isProduction = false) {
    const remaining = ALL_PERIODS.reduce((acc, period) => ({
        ...acc,
        [period]: Number(unit[period] || 0)
    }), {});

    return {
        ...unit,
        productionSiteId: isProduction ? (unit.productionSiteId || unit.id) : undefined,
        consumptionSiteId: !isProduction ? (unit.consumptionSiteId || unit.id) : undefined,
        siteName: unit.siteName || (isProduction ? unit.productionSite : unit.consumptionSite),
        type: isProduction ? (unit.type || '').toUpperCase() : undefined,
        bankingEnabled: isProduction ? (unit.banking === 1) : undefined,
        remaining
    };
}

/**
 * Checks if a unit has any remaining allocation in any period
 */
function hasRemainingAllocation(unit) {
    return Object.values(unit.remaining).some(val => val > 0);
}

/**
 * Applies shareholding percentage to an allocation amount
 */
function applyShareholding(amount, companyId, shareholdingPercentages) {
    const percentage = companyId ? (shareholdingPercentages[companyId] || 100) : 100;
    return Math.floor(amount * (percentage / 100));
}

/**
 * Creates a new allocation record
 */
function createAllocation(prod, cons, allocated = {}) {
    return {
        productionSiteId: prod.productionSiteId,
        productionSite: prod.productionSite || prod.siteName,
        siteType: prod.type,
        siteName: prod.siteName,
        consumptionSiteId: cons.consumptionSiteId,
        consumptionSite: cons.consumptionSite || cons.siteName,
        month: cons.month,
        allocated: { ...allocated }
    };
}

/**
 * Calculates allocations based on production, consumption, and shareholding percentages
 * @param {Object} params - The allocation parameters
 * @param {Array} params.productionUnits - Array of production units
 * @param {Array} params.consumptionUnits - Array of consumption units
 * @param {Array} params.bankingUnits - Array of banking units
 * @param {Object} params.manualAllocations - Manual allocation overrides
 * @param {Array} params.shareholdings - Array of shareholding records from captive table
 * @returns {Object} Allocation results
 */
export function calculateAllocations({ 
    productionUnits = [], 
    consumptionUnits = [], 
    bankingUnits = [], 
    manualAllocations = {},
    shareholdings = []
}) {
    // Create a map of companyId to shareholding percentage
    const shareholdingPercentages = shareholdings.reduce((acc, curr) => {
        acc[curr.shareholderCompanyId] = curr.shareholdingPercentage;
        return acc;
    }, {});
    console.group('🔄 Running Allocation Calculation');
    
    try {
        // Initialize units with remaining values
        const prodUnits = productionUnits.map(u => createUnitWithRemaining(u, true));
        const consUnits = consumptionUnits.map(u => createUnitWithRemaining(u, false));
        
        // Categorize production units
        const solarUnits = prodUnits.filter(u => u.type === 'SOLAR');
        const windUnits = prodUnits.filter(u => u.type === 'WIND' && !u.bankingEnabled);
        const bankingWindUnits = prodUnits.filter(u => u.type === 'WIND' && u.bankingEnabled);
        
        const allocations = [];
        const bankingAllocations = [];
        const lapseAllocations = [];
        
        // Process manual allocations first
        Object.entries(manualAllocations).forEach(([key, value]) => {
            const [prodId, consId, period] = key.split('_');
            const prodUnit = prodUnits.find(u => u.productionSiteId === prodId);
            if (prodUnit) {
                prodUnit.remaining[period] = Number(value) || 0;
            }
        });
        
        // Process allocations for each production unit group
        [solarUnits, windUnits, bankingWindUnits].forEach((group) => {
            if (!group || !group.length) return;
            
            group.forEach(prod => {
                const companyId = prod.companyId;
                
                // Find matching consumption units (same month or no month specified)
                consUnits
                    .filter(cons => !prod.month || !cons.month || prod.month === cons.month)
                    .forEach(cons => {
                        if (!hasRemainingAllocation(cons)) return;
                        
                        // Find or create allocation record
                        let allocation = allocations.find(a => 
                            a.productionSiteId === prod.productionSiteId &&
                            a.consumptionSiteId === cons.consumptionSiteId
                        );
                        
                        if (!allocation) {
                            allocation = createAllocation(prod, cons);
                            allocations.push(allocation);
                        }
                        
                        // Process allocation for each period
                        ALL_PERIODS.forEach(period => {
                            const maxAllocation = Math.min(
                                cons.remaining[period] || 0,
                                prod.remaining[period] || 0
                            );
                            
                            if (maxAllocation > 0) {
                                const allocated = applyShareholding(
                                    maxAllocation, 
                                    companyId, 
                                    shareholdingPercentages
                                );
                                
                                if (allocated > 0) {
                                    allocation.allocated[period] = (allocation.allocated[period] || 0) + allocated;
                                    allocation.shareholdingPercentage = shareholdingPercentages[companyId] || 100;
                                    prod.remaining[period] -= allocated;
                                    cons.remaining[period] = (cons.remaining[period] || 0) - allocated;
                                }
                            }
                        });
                    });
                
                // Handle remaining unallocated production
                if (hasRemainingAllocation(prod)) {
                    if (prod.bankingEnabled) {
                        bankingAllocations.push({
                            ...createAllocation(prod, {
                                consumptionSiteId: 'BANK',
                                consumptionSite: 'Banking',
                                siteName: 'Banking',
                                month: prod.month
                            }),
                            type: 'BANKING',
                            allocated: { ...prod.remaining }
                        });
                    } else {
                        lapseAllocations.push({
                            ...createAllocation(prod, {
                                consumptionSiteId: 'LAPSE',
                                consumptionSite: 'Lapsed',
                                siteName: 'Lapsed',
                                month: prod.month
                            }),
                            type: 'LAPSE',
                            allocated: { ...prod.remaining }
                        });
                    }
                }
            });
        });
        
        // Process banking allocations for remaining consumption needs
        if (bankingAllocations.length > 0) {
            consUnits.forEach(cons => {
                if (!hasRemainingAllocation(cons)) return;
                
                bankingAllocations.forEach(bank => {
                    const bankCompanyId = bank.companyId;
                    const bankShareholdingPercentage = bankCompanyId ? (shareholdingPercentages[bankCompanyId] || 100) : 100;
                    
                    ALL_PERIODS.forEach(period => {
                        const needed = Number(cons.remaining[period] || 0);
                        const available = Number(bank.allocated[period] || 0);
                        
                        if (available > 0 && needed > 0) {
                            const maxAllocation = Math.min(available, needed);
                            const allocated = applyShareholding(
                                maxAllocation,
                                bankCompanyId,
                                shareholdingPercentages
                            );
                            
                            if (allocated > 0) {
                                // Create or update allocation record
                                let allocation = allocations.find(a => 
                                    a.productionSiteId === bank.productionSiteId &&
                                    a.consumptionSiteId === cons.consumptionSiteId
                                );
                                
                                if (!allocation) {
                                    allocation = createAllocation(bank, cons);
                                    allocations.push(allocation);
                                }
                                
                                allocation.allocated[period] = (allocation.allocated[period] || 0) + allocated;
                                bank.allocated[period] -= allocated;
                                cons.remaining[period] -= allocated;
                            }
                        }
                    });
                });
            });
        }
        
        console.groupEnd();
        return {
            allocations,
            bankingAllocations: bankingAllocations.filter(bank => 
                Object.values(bank.allocated).some(v => v > 0)
            ),
            lapseAllocations: lapseAllocations.filter(lapse => 
                Object.values(lapse.allocated).some(v => v > 0)
            ),
            remainingProduction: prodUnits.filter(hasRemainingAllocation),
            remainingConsumption: consUnits.filter(hasRemainingAllocation)
        };
    } catch (error) {
        console.error('Error in calculateAllocations:', error);
        throw error;
    }
}
