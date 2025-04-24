const BaseDAL = require('../common/baseDAL');
const TableNames = require('../constants/tableNames');
const logger = require('../utils/logger');
const { formatMonthYearKey } = require('../utils/dateUtils');
const { ALL_PERIODS } = require('../constants/periods');

class LapseDAL extends BaseDAL {
    constructor() {
        super(TableNames.LAPSE);
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

            return await this.create(item);
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

            return await this.update(pk, sk, updateData);
        } catch (error) {
            logger.error('LapseDAL - updateLapse error:', error);
            throw error;
        }
    }

    async getLapsesByMonth(companyId, month) {
        try {
            const sk = formatMonthYearKey(month);
            this.validateSortKey(sk);

            return await this.query({
                pk: `${companyId}`,
                sk: sk
            });
        } catch (error) {
            logger.error('LapseDAL - getLapsesByMonth error:', error);
            throw error;
        }
    }

    async getLapsesByProductionSite(companyId, productionSiteId, fromMonth, toMonth) {
        try {
            return await this.query({
                pk: `${companyId}_${productionSiteId}`,
                skBetween: [
                    formatMonthYearKey(fromMonth),
                    formatMonthYearKey(toMonth)
                ]
            });
        } catch (error) {
            logger.error('LapseDAL - getLapsesByProductionSite error:', error);
            throw error;
        }
    }

    async deleteLapse(pk, sk) {
        try {
            this.validateSortKey(sk);
            return await this.delete(pk, sk);
        } catch (error) {
            logger.error('LapseDAL - deleteLapse error:', error);
            throw error;
        }
    }
}

module.exports = new LapseDAL();