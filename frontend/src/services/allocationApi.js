import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

class AllocationApi {
    formatAllocationData(data) {
        return {
            ...data,
            allocated: Object.entries(data.allocated).reduce((acc, [key, value]) => {
                acc[key] = Math.round(Number(value) || 0);
                return acc;
            }, {})
        };
    }

    async fetchAll(month) {
        try {
            const [allocations, banking, lapse] = await Promise.all([
                api.get(API_CONFIG.ENDPOINTS.ALLOCATION.GET_ALL(month)),
                api.get(API_CONFIG.ENDPOINTS.BANKING.GET_ALL),
                api.get(API_CONFIG.ENDPOINTS.LAPSE.GET_ALL)
            ]);

            return {
                allocations: allocations.data?.data || [],
                banking: banking.data?.data || [],
                lapse: lapse.data?.data || []
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async create(data, type = 'ALLOCATION') {
        try {
            const formattedData = this.formatAllocationData(data);
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

            const response = await api.post(endpoint, formattedData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async update(pk, sk, data, type = 'ALLOCATION') {
        try {
            const formattedData = this.formatAllocationData(data);
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
        console.error('[Allocation API Error]:', error);
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
    }

    formatMonth(month, year) {
        return `${month.toString().padStart(2, '0')}${year}`;
    }
}

const allocationApi = new AllocationApi();
export default allocationApi;