import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

class AllocationApi {
    formatAllocationData(data, type = 'ALLOCATION') {
        // Extract flat period values into root
        const ensureAllocated = (input) => {
            const a = input.allocated || {};
            return {
                c1: Number(a.c1) || 0,
                c2: Number(a.c2) || 0,
                c3: Number(a.c3) || 0,
                c4: Number(a.c4) || 0,
                c5: Number(a.c5) || 0,
            };
        };
        const flat = ensureAllocated(data);
        const base = { ...data, ...flat };

        // For ALLOCATION, ensure consumptionSiteId and consumptionSite are present
        if ((type || data.type || '').toUpperCase() === 'ALLOCATION') {
            return {
                ...base,
                consumptionSiteId: data.consumptionSiteId,
                consumptionSite: data.consumptionSite
            };
        }
        // For BANKING/LAPSE, only required fields plus allocated
        if (["BANKING", "LAPSE"].includes((type || data.type || '').toUpperCase())) {
            return { ...base };
        }
        return base;
    }

    async fetchAll(month) {
        try {
            // Construct the URL with proper path joining
            const endpoint = `${API_CONFIG.ENDPOINTS.ALLOCATION.BASE}/month/${month}`;
            const response = await api.get(endpoint);
            return {
                allocations: response.data?.data || [],
                banking: response.data?.banking || [],
                lapse: response.data?.lapse || []
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async createAllocation(data) {
        try {
            const formattedData = this.formatAllocationData(data, 'ALLOCATION');
            console.log('[AllocationApi] Outgoing ALLOCATION payload:', formattedData);
            const response = await api.post(API_CONFIG.ENDPOINTS.ALLOCATION.CREATE, formattedData);
            return response.data;
        } catch (error) {
            console.error('[AllocationApi] Backend ALLOCATION error:', error?.response?.data || error);
            throw this.handleError(error);
        }
    }

    async createBanking(data) {
        try {
            const formattedData = this.formatAllocationData(data, 'BANKING');
            console.log('[AllocationApi] Outgoing BANKING payload:', formattedData);
            const response = await api.post(API_CONFIG.ENDPOINTS.BANKING.CREATE, formattedData);
            return response.data;
        } catch (error) {
            console.error('[AllocationApi] Backend BANKING error:', error?.response?.data || error);
            throw this.handleError(error);
        }
    }

    async createLapse(data) {
        try {
            const formattedData = this.formatAllocationData(data, 'LAPSE');
            console.log('[AllocationApi] Outgoing LAPSE payload:', formattedData);
            const response = await api.post(API_CONFIG.ENDPOINTS.LAPSE.CREATE, formattedData);
            return response.data;
        } catch (error) {
            console.error('[AllocationApi] Backend LAPSE error:', error?.response?.data || error);
            throw this.handleError(error);
        }
    }

    async create(data, type = 'ALLOCATION') {
        try {
            const formattedData = this.formatAllocationData(data, type);
            let endpoint;
            
            switch (type.toUpperCase()) {
                case 'BANKING':
                    endpoint = API_CONFIG.ENDPOINTS.BANKING.CREATE;
                    break;
                case 'LAPSE':
                    endpoint = API_CONFIG.ENDPOINTS.LAPSE.CREATE;
                    break;
                default:
                    endpoint = API_CONFIG.ENDPOINTS.ALLOCATION.CREATE;
            }

            console.log('[AllocationApi] Outgoing payload:', formattedData);
            const response = await api.post(endpoint, formattedData);
            return response.data;
        } catch (error) {
            console.error('[AllocationApi] Backend error:', error?.response?.data || error);
            throw this.handleError(error);
        }
    }

    async update(pk, sk, data, type = 'ALLOCATION') {
        try {
            const formattedData = this.formatAllocationData(data, type);
            let updateEndpoint;
            
            switch (type.toUpperCase()) {
                case 'BANKING':
                    updateEndpoint = API_CONFIG.ENDPOINTS.BANKING.UPDATE(pk, sk);
                    break;
                case 'LAPSE':
                    updateEndpoint = API_CONFIG.ENDPOINTS.LAPSE.UPDATE(pk, sk);
                    break;
                default:
                    updateEndpoint = API_CONFIG.ENDPOINTS.ALLOCATION.UPDATE(pk, sk);
            }

            const response = await api.put(updateEndpoint, formattedData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(pk, sk, type = 'ALLOCATION') {
        try {
            let deleteEndpoint;
            
            switch (type.toUpperCase()) {
                case 'BANKING':
                    deleteEndpoint = API_CONFIG.ENDPOINTS.BANKING.DELETE(pk, sk);
                    break;
                case 'LAPSE':
                    deleteEndpoint = API_CONFIG.ENDPOINTS.LAPSE.DELETE(pk, sk);
                    break;
                default:
                    deleteEndpoint = API_CONFIG.ENDPOINTS.ALLOCATION.DELETE(pk, sk);
            }

            const response = await api.delete(deleteEndpoint);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    handleError(error) {
        // Enhanced error logging
        if (error.response) {
            console.error('[Allocation API Error]:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
        } else {
            console.error('[Allocation API Error]:', error);
        }
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
    }

    formatMonth(month, year) {
        return `${month.toString().padStart(2, '0')}${year}`;
    }
}

const allocationApi = new AllocationApi();
export default allocationApi;