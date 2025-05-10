const productionUnitDAL = require('../productionUnit/productionUnitDAL');
const consumptionUnitDAL = require('../consumptionUnit/consumptionUnitDAL');
const bankingDAL = require('../banking/bankingDAL');
const allocationDAL = require('../allocation/allocationDAL');
const consumptionSiteDAL = require('../consumptionSite/consumptionSiteDAL');
const logger = require('../utils/logger');

async function calculateFormVBMetrics(financialYear) {
    try {
        // Parse the financial year (e.g., '2024-2025')
        const [startYearStr, endYearStr] = financialYear.split('-');
        const startYear = parseInt(startYearStr, 10);
        const endYear = parseInt(endYearStr, 10);

        // Generate months for the financial year (MMYYYY format)
        const months = [];
        // April to December of start year
        for (let month = 4; month <= 12; month++) {
            months.push(`${month.toString().padStart(2, '0')}${startYear}`);
        }
        // January to March of end year
        for (let month = 1; month <= 3; month++) {
            months.push(`${month.toString().padStart(2, '0')}${endYear}`);
        }

        logger.info('Processing months:', months);

        // Fetch all required data
        const [productionData, consumptionData, bankingData, allocationData, consumptionSites] = await Promise.all([
            productionUnitDAL.getAllProductionUnits(),
            consumptionUnitDAL.getAllConsumptionUnits(),
            bankingDAL.getAllBankingUnits(),
            allocationDAL.getAllAllocatedUnits(),
            consumptionSiteDAL.getAllConsumptionSites()
        ]);

        // Filter data by months in the financial year
        const filterByMonths = (data) => {
            return data.filter(item => months.includes(item.sk));
        };

        // Filter data for the financial year
        const filteredProductionData = filterByMonths(productionData);
        const filteredConsumptionData = filterByMonths(consumptionData);
        const filteredBankingData = filterByMonths(bankingData);
        const filteredAllocationData = filterByMonths(allocationData);

        // Calculate totals
        const calculateTotal = (items) => {
            return items.reduce((sum, item) => {
                const values = [
                    item.c1 || 0, 
                    item.c2 || 0, 
                    item.c3 || 0, 
                    item.c4 || 0, 
                    item.c5 || 0
                ];
                return sum + values.reduce((a, b) => a + b, 0);
            }, 0);
        };

        // Calculate total generated units
        const totalGeneratedUnits = calculateTotal(filteredProductionData);

        // Calculate auxiliary consumption (5% of total generation)
        const auxiliaryConsumption = totalGeneratedUnits * 0.05;

        // Calculate aggregate generation
        const aggregateGeneration = totalGeneratedUnits - auxiliaryConsumption;

        // Calculate 51% of aggregate generation
        const percentage51 = aggregateGeneration * 0.51;

        // Calculate actual consumption units
        const totalAllocatedUnits = calculateTotal(filteredAllocationData);

        // Calculate percentage of actual adjusted/consumed units
        const percentageAdjusted = (totalAllocatedUnits / aggregateGeneration) * 100;

        // Calculate site metrics
        const siteMetrics = consumptionSites.map(site => {
            const siteAllocations = filteredAllocationData.filter(a => 
                a.consumptionSiteId === site.consumptionSiteId
            );

            const siteTotalAllocated = calculateTotal(siteAllocations);
            const siteShare = (site.equityShares / 100) || 0;

            // Calculate permitted consumption
            const sitePermittedConsumption = {
                withZero: percentage51 * siteShare,
                minus10: percentage51 * siteShare * 0.9,
                plus10: percentage51 * siteShare * 1.1
            };

            return {
                siteName: site.siteName,
                equityShares: site.equityShares,
                allocationPercentage: siteShare * 100,
                annualGeneration: totalGeneratedUnits,
                auxiliaryConsumption: auxiliaryConsumption,
                verificationCriteria: percentage51 * siteShare,
                permittedConsumption: sitePermittedConsumption,
                actualConsumption: siteTotalAllocated,
                normsCompliance: (
                    siteTotalAllocated <= sitePermittedConsumption.plus10 && 
                    siteTotalAllocated >= sitePermittedConsumption.minus10
                )
            };
        });

        return {
            financialYear,
            totalGeneratedUnits,
            auxiliaryConsumption,
            aggregateGeneration,
            percentage51,
            totalAllocatedUnits,
            percentageAdjusted,
            siteMetrics
        };
    } catch (error) {
        logger.error('[calculateFormVBMetrics] Error:', error);
        throw error;
    }
}

module.exports = calculateFormVBMetrics;
