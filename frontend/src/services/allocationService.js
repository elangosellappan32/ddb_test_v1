import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

class AllocationService {
    async getAllocations(month) {
        try {
            const response = await api.get(`/allocation/${month || ''}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async createAllocation(data) {
        try {
            const response = await api.post('/allocation', data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateAllocation(data) {
        try {
            const response = await api.put(`/allocation/${data.pk}/${data.sk}`, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async autoAllocate(productionSites, consumptionSites, month) {
        try {
            const allocations = this.calculateAllocations(productionSites, consumptionSites, month);
            const response = await api.post('/allocation/batch', { allocations });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getBankingAllocations(month) {
        try {
            const response = await api.get(`/allocation/${month || ''}?type=Banking`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getLapseAllocations(month) {
        try {
            const response = await api.get(`/allocation/${month || ''}?type=Lapse`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async batchUpdate(allocations) {
        try {
            const response = await api.put('/allocation/batch', { allocations });
            return response.data;
        } catch (error) {
            throw error.response?.data || { 
                success: false, 
                message: 'Failed to batch update allocations' 
            };
        }
    }

    calculateAllocations(productionSites, consumptionSites, month) {
        const allocations = [];
        let remainingProduction = { ...productionSites[0]?.totalAvailable };

        // First, allocate to consumption sites
        consumptionSites.forEach(site => {
            if (site.totalRequired > 0) {
                const allocation = {
                    month,
                    productionSiteId: productionSites[0]?.productionSiteId,
                    consumptionSiteId: site.consumptionSiteId,
                    productionSite: productionSites[0]?.name,
                    consumptionSite: site.name,
                    allocated: Math.min(remainingProduction, site.totalRequired),
                    type: 'Allocation'
                };
                
                remainingProduction -= allocation.allocated;
                allocations.push(allocation);
            }
        });

        // Then handle banking if enabled and there are remaining units
        if (remainingProduction > 0 && productionSites[0]?.bankingEnabled) {
            allocations.push({
                month,
                productionSiteId: productionSites[0].productionSiteId,
                consumptionSiteId: 'BANKING',
                productionSite: productionSites[0].name,
                consumptionSite: 'Banking',
                allocated: remainingProduction,
                type: 'Banking'
            });
        }

        return allocations;
    }

    handleError(error) {
        if (error.response) {
            throw new Error(error.response.data.message || 'An error occurred');
        }
        throw error;
    }
}

const allocationService = new AllocationService();
export default allocationService;