import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

class AllocationService {
    async getAllocations(month) {
        try {
            const response = await api.get(`${API_CONFIG.ENDPOINTS.ALLOCATION.GET_ALL}/${month || ''}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

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

            const endpoint = type.toLowerCase() === 'banking' 
                ? API_CONFIG.ENDPOINTS.BANKING.CREATE 
                : type.toLowerCase() === 'lapse'
                ? API_CONFIG.ENDPOINTS.LAPSE.CREATE
                : API_CONFIG.ENDPOINTS.ALLOCATION.CREATE;

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

    async autoAllocate(productionSites, consumptionSites, month) {
        try {
            const allocations = this.calculateAllocations(productionSites, consumptionSites, month);
            const response = await api.post(API_CONFIG.ENDPOINTS.ALLOCATION.BATCH, { allocations });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getBankingAllocations(month) {
        try {
            const response = await api.get(`${API_CONFIG.ENDPOINTS.BANKING.GET_ALL}/${month || ''}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getLapseAllocations(month) {
        try {
            const response = await api.get(`${API_CONFIG.ENDPOINTS.LAPSE.GET_ALL}/${month || ''}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async batchUpdate(allocations) {
        try {
            const enrichedAllocations = allocations.map(allocation => ({
                ...allocation,
                companyId: String(localStorage.getItem('companyId') || '1'),
                updatedat: new Date().toISOString()
            }));

            const response = await api.put(API_CONFIG.ENDPOINTS.ALLOCATION.BATCH, { 
                allocations: enrichedAllocations 
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || { 
                success: false, 
                message: 'Failed to batch update allocations' 
            };
        }
    }

    calculateAllocations(productionSites, consumptionSites, month) {
        return consumptionSites.map(site => ({
            consumptionSiteId: site.consumptionSiteId,
            productionSiteId: this.findBestProductionSite(site, productionSites),
            month,
            companyId: String(localStorage.getItem('companyId') || '1'),
            type: 'ALLOCATION',
            allocated: {
                c1: 0, c2: 0, c3: 0, c4: 0, c5: 0
            },
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString(),
            version: 1
        }));
    }

    findBestProductionSite(consumptionSite, productionSites) {
        // Simple allocation - pick first available site
        // This can be enhanced with more sophisticated matching logic
        const availableSite = productionSites.find(site => site.status === 'active');
        return availableSite?.productionSiteId;
    }

    handleError(error) {
        console.error('[AllocationService] Error:', error);
        
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }

        if (error.response?.status === 400) {
            throw new Error('Validation failed: Please check your input');
        }

        if (error.response?.status === 404) {
            throw new Error('Resource not found');
        }

        throw new Error(error.message || 'An unexpected error occurred');
    }
}

const allocationService = new AllocationService();
export default allocationService;