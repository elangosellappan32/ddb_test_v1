const BaseDAL = require('../common/baseDAL');
const TableNames = require('../constants/tableNames');
const logger = require('../utils/logger');
const { formatMonthYearKey } = require('../utils/dateUtils');
const { ALL_PERIODS } = require('../constants/periods');

class LapseDAL extends BaseDAL {
    constructor() {
        super(TableNames.LAPSE);
    }

    validateSortKey(sk) {
        // Accepts MMYYYY or 6 digit string for month-year
        if (!sk || typeof sk !== 'string' || !/^(0[1-9]|1[0-2])\d{4}$/.test(sk)) {
            throw new Error(`Invalid sort key (sk): ${sk}. Must be in MMYYYY format (e.g., 042025)`);
        }
    }

    async createLapse(lapseData) {
        try {
            this.validateSortKey(lapseData.sk);
            
            // Ensure all periods have values
            const normalizedAllocated = ALL_PERIODS.reduce((acc, period) => {
                acc[period] = Math.round(Number(lapseData.allocated?.[period] || 0));
                return acc;
            }, {});

            const item = {
                ...lapseData,
                allocated: normalizedAllocated,
                type: 'LAPSE',
                createdat: new Date().toISOString(),
                updatedat: new Date().toISOString()
            };

            // Use BaseDAL.putItem for insert
            return await this.putItem(item);
        } catch (error) {
            logger.error('LapseDAL - createLapse error:', error);
            throw error;
        }
    }

    async updateLapse(pk, sk, updates) {
        try {
            this.validateSortKey(sk);
            
            if (updates.allocated) {
                updates.allocated = ALL_PERIODS.reduce((acc, period) => {
                    acc[period] = Math.round(Number(updates.allocated[period] || 0));
                    return acc;
                }, {});
            }

            const updateData = {
                ...updates,
                updatedat: new Date().toISOString()
            };

            // Use BaseDAL.updateItem for updates
            return await this.updateItem({ pk, sk }, updateData);
        } catch (error) {
            logger.error('LapseDAL - updateLapse error:', error);
            throw error;
        }
    }

    async getLapsesByMonth(companyId, month) {
        try {
            const sk = formatMonthYearKey(month);
            this.validateSortKey(sk);

            // Query by pk and exact sk
            return await this.queryItems(
                { expression: 'pk = :pk AND sk = :sk', values: { ':pk': String(companyId), ':sk': sk } }
            );
        } catch (error) {
            logger.error('LapseDAL - getLapsesByMonth error:', error);
            throw error;
        }
    }

    async getLapsesByProductionSite(companyId, productionSiteId, fromMonth, toMonth) {
        try {
            // Query with sk range
            return await this.queryItems(
                { expression: 'pk = :pk AND sk BETWEEN :from AND :to', values: {
                    ':pk': `${companyId}_${productionSiteId}`,
                    ':from': formatMonthYearKey(fromMonth),
                    ':to': formatMonthYearKey(toMonth)
                } }
            );
        } catch (error) {
            logger.error('LapseDAL - getLapsesByProductionSite error:', error);
            throw error;
        }
    }

    async deleteLapse(pk, sk) {
        try {
            this.validateSortKey(sk);
            // Use BaseDAL.deleteItem to remove item
            return await this.deleteItem({ pk, sk });
        } catch (error) {
            logger.error('LapseDAL - deleteLapse error:', error);
            throw error;
        }
    }
}

module.exports = new LapseDAL();