const productionUnitDAL = require('../productionUnit/productionUnitDAL');
const consumptionUnitDAL = require('../consumptionUnit/consumptionUnitDAL');
const bankingDAL = require('../banking/bankingDAL');
const allocationDAL = require('../allocation/allocationDAL');
const consumptionSiteDAL = require('../consumptionSite/consumptionSiteDAL');
const logger = require('../utils/logger');

async function calculateFormVAMetrics(financialYear) {
    try {
        // Get production, consumption and banking data for the financial year
        const [startMonth, endMonth] = getFinancialYearRange(financialYear);
        
        const [productionData, consumptionData, bankingData, consumptionSites] = await Promise.all([
            productionUnitDAL.getProductionUnitsForPeriod(startMonth, endMonth),
            consumptionUnitDAL.getConsumptionUnitsForPeriod(startMonth, endMonth),
            bankingDAL.getBankingForPeriod(startMonth, endMonth),
            consumptionSiteDAL.getAllConsumptionSites()
        ]);

        // Filter active data
        const filteredProductionData = productionData.filter(unit => unit.status !== 'Inactive');
        const filteredConsumptionData = consumptionData.filter(unit => unit.status !== 'Inactive');
        const filteredBankingData = bankingData.filter(unit => unit.status !== 'Inactive');

        // Calculate main metrics
        const totalGeneratedUnits = calculateTotalUnits(filteredProductionData);
        const auxiliaryConsumption = calculateTotalUnits(filteredConsumptionData);
        const totalBankingUnits = calculateTotalUnits(filteredBankingData);
        const aggregateGeneration = totalGeneratedUnits + totalBankingUnits;

        // Calculate site-specific metrics with proper calculations
        const siteMetrics = consumptionSites.map(site => {
            // Calculate consumption units for this site
            const siteConsumptionUnits = filteredConsumptionData.filter(unit => 
                unit.pk === `${site.companyId || '1'}_${site.consumptionSiteId}`
            );
            const siteTotalConsumption = calculateTotalUnits(siteConsumptionUnits);

            // Calculate site's share of generation and auxiliary consumption
            const siteShare = Number(site.allocationPercentage || 0);
            const siteAnnualGeneration = Math.round((siteShare / 100) * totalGeneratedUnits);
            const siteAuxiliaryConsumption = Math.round((siteShare / 100) * auxiliaryConsumption);
            
            // Calculate net generation and verification criteria
            const siteNetGeneration = siteAnnualGeneration - siteAuxiliaryConsumption;
            const siteVerificationCriteria = Math.round(siteNetGeneration * 0.51);

            return {
                ...site,
                allocationPercentage: siteShare,
                annualGeneration: siteAnnualGeneration,
                auxiliaryConsumption: siteAuxiliaryConsumption,
                netGeneration: siteNetGeneration,
                verificationCriteria: siteVerificationCriteria,
                totalConsumptionUnits: siteTotalConsumption,
                norms: siteTotalConsumption >= siteVerificationCriteria ? 'Yes' : 'No'
            };
        });

        return {
            financialYear: `${financialYear}-${Number(financialYear) + 1}`,
            totalGeneratedUnits,
            auxiliaryConsumption,
            aggregateGeneration,
            percentage51: Math.round(aggregateGeneration * 0.51),
            totalAllocatedUnits: calculateTotalUnits(filteredConsumptionData),
            percentageAdjusted: aggregateGeneration ? 
                Math.round((calculateTotalUnits(filteredConsumptionData) / aggregateGeneration) * 100) : 0,
            siteMetrics
        };
    } catch (error) {
        logger.error('[FormVACalculation] Error calculating metrics:', error);
        throw error;
    }
}

module.exports = calculateFormVAMetrics;