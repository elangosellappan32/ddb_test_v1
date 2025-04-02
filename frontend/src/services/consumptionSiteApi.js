import api, { handleApiError } from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const consumptionSiteApi = {
    fetchAll: async () => {
        try {
            console.log('[ConsumptionSiteAPI] Fetching all sites');
            const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
            
            const formattedData = response?.data?.data?.map(site => ({
                ...site,
                companyId: Number(site.companyId),
                consumptionSiteId: Number(site.consumptionSiteId),
                annualConsumption: Number(site.annualConsumption || 0),
                injectionVoltage_KV: Number(site.injectionVoltage_KV || 0),
                version: Number(site.version || 1)
            })) || [];

            return { data: formattedData };
        } catch (error) {
            throw handleApiError(error);
        }
    },

    fetchOne: async (companyId, consumptionSiteId) => {
        try {
            console.log('[ConsumptionSiteAPI] Fetching site:', { companyId, consumptionSiteId });
            const response = await api.get(
                API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ONE(companyId, consumptionSiteId)
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    create: async (data) => {
        try {
            console.log('[ConsumptionSiteAPI] Creating site:', data);
            const response = await api.post(
                API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.CREATE,
                data
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    update: async (companyId, consumptionSiteId, data) => {
        try {
            console.log('[ConsumptionSiteAPI] Updating site:', {
                companyId,
                consumptionSiteId,
                data
            });
            const response = await api.put(
                API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.UPDATE(companyId, consumptionSiteId),
                data
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    delete: async (companyId, consumptionSiteId) => {
        try {
            console.log('[ConsumptionSiteAPI] Deleting site:', { companyId, consumptionSiteId });
            const response = await api.delete(
                API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.DELETE(companyId, consumptionSiteId)
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

export default consumptionSiteApi;