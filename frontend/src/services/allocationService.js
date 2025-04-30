const api = require('./apiUtils');
const { API_CONFIG } = require('../config/api.config');

class AllocationService {
    async createAllocation(data, type = 'ALLOCATION') {
        try {
            const enrichedData = {
                ...data,
                companyId: String(localStorage.getItem('companyId') || '1'),
                type: type.toUpperCase(),
                version: 1,
                createdat: new Date().toISOString(),
                updatedat: new Date().toISOString()
            };

            // For banking type, ensure we keep negative values
            if (type.toUpperCase() === 'BANKING') {
                enrichedData.allocated = Object.keys(enrichedData.allocated || {}).reduce((acc, period) => {
                    acc[period] = Number(enrichedData.allocated[period]);
                    return acc;
                }, {});
            } else {
                // For other types, ensure non-negative values
                enrichedData.allocated = Object.keys(enrichedData.allocated || {}).reduce((acc, period) => {
                    acc[period] = Math.max(0, Number(enrichedData.allocated[period] || 0));
                    return acc;
                }, {});
            }

            const endpoint = type.toLowerCase() === 'banking' 
                ? API_CONFIG.ENDPOINTS.BANKING.CREATE 
                : type.toLowerCase() === 'lapse'
                ? API_CONFIG.ENDPOINTS.LAPSE.CREATE
                : API_CONFIG.ENDPOINTS.ALLOCATION.CREATE;

            console.log(`📝 Creating ${type}:`, {
                site: enrichedData.siteName,
                type: enrichedData.type,
                periods: enrichedData.allocated
            });

            const response = await api.post(endpoint, enrichedData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateAllocation(data, type = 'ALLOCATION') {
        try {
            const enrichedData = {
                ...data,
                companyId: String(localStorage.getItem('companyId') || '1'),
                type: type.toUpperCase(),
                updatedat: new Date().toISOString()
            };

            // For banking type, allow negative values
            if (type.toUpperCase() === 'BANKING') {
                enrichedData.allocated = Object.keys(enrichedData.allocated || {}).reduce((acc, period) => {
                    acc[period] = Number(enrichedData.allocated[period]);
                    return acc;
                }, {});
            } else {
                // For other types, ensure non-negative values
                enrichedData.allocated = Object.keys(enrichedData.allocated || {}).reduce((acc, period) => {
                    acc[period] = Math.max(0, Number(enrichedData.allocated[period] || 0));
                    return acc;
                }, {});
            }

            const endpoint = type.toLowerCase() === 'banking'
                ? API_CONFIG.ENDPOINTS.BANKING.UPDATE(data.pk, data.sk)
                : type.toLowerCase() === 'lapse'
                ? API_CONFIG.ENDPOINTS.LAPSE.UPDATE(data.pk, data.sk)
                : API_CONFIG.ENDPOINTS.ALLOCATION.UPDATE(data.pk, data.sk);

            const response = await api.put(endpoint, enrichedData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    handleError(error) {
        console.error('❌ Allocation Error:', error?.response?.data || error?.message);
        throw error.response?.data || { 
            success: false, 
            message: error.message || 'An unexpected error occurred' 
        };
    }
}

const allocationService = new AllocationService();
export default allocationService;