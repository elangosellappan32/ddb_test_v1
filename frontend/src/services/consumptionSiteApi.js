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
                version: Number(site.version || 1)
            })) || [];

            return { data: formattedData };
        } catch (error) {
            throw handleApiError(error);
        }
    },

    fetchOne: async (companyId, consumptionSiteId) => {
        try {
            // Ensure parameters are valid numbers
            const validCompanyId = parseInt(companyId, 10);
            const validConsumptionSiteId = parseInt(consumptionSiteId, 10);

            if (isNaN(validCompanyId) || isNaN(validConsumptionSiteId)) {
                throw new Error('Invalid company ID or site ID');
            }

            console.log('[ConsumptionSiteAPI] Fetching site:', { companyId: validCompanyId, siteId: validConsumptionSiteId });
            const response = await api.get(
                API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ONE(validCompanyId, validConsumptionSiteId)
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    create: async (data) => {
        try {
            // Format the data with proper types
            const payload = {
                companyId: '1', // Default company ID
                consumptionSiteId: data.consumptionSiteId,
                name: data.name,
                type: data.type,
                location: data.location,
                annualConsumption: Number(data.annualConsumption),
                status: data.status,
                version: 1
            };

            console.log('[ConsumptionSiteAPI] Create payload:', payload);

            const response = await api.post('/consumption-site', payload);
            return response.data;
        } catch (error) {
            console.error('[ConsumptionSiteAPI] Create error:', error);
            throw error;
        }
    },

    update: async (companyId, consumptionSiteId, data) => {
        try {
            // Ensure we have the required fields and proper format
            const payload = {
                name: data.name,
                type: data.type,
                location: data.location,
                annualConsumption: Number(data.annualConsumption),
                status: data.status,
                version: Number(data.version) || 1
            };

            console.log('[ConsumptionSiteAPI] Update payload:', payload);

            const response = await api.put(
                API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.UPDATE(companyId, consumptionSiteId),
                payload
            );
            return response.data;
        } catch (error) {
            console.error('[ConsumptionSiteAPI] Update error:', error);
            throw error;
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