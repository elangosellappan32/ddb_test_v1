const productionUnitDAL = require('../productionUnit/productionUnitDAL');
const consumptionUnitDAL = require('../consumptionUnit/consumptionUnitDAL');
const bankingDAL = require('../banking/bankingDAL');
const allocationDAL = require('../allocation/allocationDAL');
const logger = require('../utils/logger');

async function calculateFormVAMetrics() {
    try {
        // Fetch data from respective sources
        const productionData = await productionUnitDAL.getAllProductionUnits();
        const consumptionData = await consumptionUnitDAL.getAllConsumptionUnits();
        const bankingData = await bankingDAL.getAllBankingUnits();
        const allocationData = await allocationDAL.getAllAllocatedUnits();

        // Calculate total units by summing c1-c5 for each record
        const calculateTotalUnits = (data) => {
            return data.reduce((sum, item) => {
                const periodSum = ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((periodTotal, period) => 
                    periodTotal + (Number(item[period] || 0)), 0);
                return sum + periodSum;
            }, 0);
        };

        // 1. Total Generated units
        const totalGeneratedUnits = calculateTotalUnits(productionData);
        
        // 2. Auxiliary Consumption
        const auxiliaryConsumption = calculateTotalUnits(consumptionData);
        
        // 3. Net units available (Aggregate generation)
        const totalBankingUnits = calculateTotalUnits(bankingData);
        const aggregateGeneration = totalGeneratedUnits + totalBankingUnits;
        
        // 4. 51% of aggregate generation
        const percentage51 = Math.round(aggregateGeneration * 0.51);
        
        // 5. Actual Adjusted units
        const totalAllocatedUnits = calculateTotalUnits(allocationData);
        
        // 6. Percentage calculation
        const percentageAdjusted = aggregateGeneration > 0 
            ? ((totalAllocatedUnits / aggregateGeneration) * 100).toFixed(2)
            : 0;

        // Log calculations for debugging
        logger.info('Form VA Calculations:', {
            totalGeneratedUnits,
            auxiliaryConsumption,
            aggregateGeneration,
            percentage51,
            totalAllocatedUnits,
            percentageAdjusted
        });

        // Return metrics in the format matching FORMAT V-A
        return {
            totalGeneratedUnits,
            auxiliaryConsumption,
            aggregateGeneration,
            percentage51,
            totalAllocatedUnits,
            percentageAdjusted
        };
    } catch (error) {
        logger.error('[calculateFormVAMetrics] Error:', error);
        throw error;
    }
}

module.exports = calculateFormVAMetrics;