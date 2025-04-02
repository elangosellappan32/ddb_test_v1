import api, { handleApiError } from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const formatDateToMMYYYY = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${year}`;
};

const consumptionUnitApi = {
    fetchAll: async (companyId, consumptionSiteId) => {
        try {
            console.log('[ConsumptionUnitAPI] Fetching units:', { companyId, consumptionSiteId });
            const response = await api.get(
                API_CONFIG.ENDPOINTS.CONSUMPTION.UNIT.GET_ALL(companyId, consumptionSiteId)
            );

            const allData = Array.isArray(response.data) ? response.data : 
                          Array.isArray(response.data?.data) ? response.data.data : [];

            const formattedData = allData.map(item => ({
                ...item,
                c1: Number(item.c1 || 0),
                c2: Number(item.c2 || 0),
                c3: Number(item.c3 || 0),
                c4: Number(item.c4 || 0),
                c5: Number(item.c5 || 0),
                total: Number(item.total || 0)
            }));

            return { data: formattedData };
        } catch (error) {
            throw handleApiError(error);
        }
    },

    fetchOne: async (companyId, consumptionSiteId, sk) => {
        try {
            console.log('[ConsumptionUnitAPI] Fetching unit:', { companyId, consumptionSiteId, sk });
            const response = await api.get(
                API_CONFIG.ENDPOINTS.CONSUMPTION.UNIT.GET_ONE(companyId, consumptionSiteId, sk)
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    create: async (companyId, consumptionSiteId, data) => {
        try {
            const unitData = {
                ...data,
                sk: formatDateToMMYYYY(data.date),
                companyId: String(companyId),
                consumptionSiteId: String(consumptionSiteId)
            };

            console.log('[ConsumptionUnitAPI] Creating unit:', unitData);
            const response = await api.post(
                API_CONFIG.ENDPOINTS.CONSUMPTION.UNIT.CREATE(companyId, consumptionSiteId),
                unitData
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    update: async (companyId, consumptionSiteId, sk, data) => {
        try {
            if (!sk) {
                throw new Error('Sort key (sk) is required for updates');
            }

            console.log('[ConsumptionUnitAPI] Updating unit:', { companyId, consumptionSiteId, sk, data });
            const response = await api.put(
                API_CONFIG.ENDPOINTS.CONSUMPTION.UNIT.UPDATE(companyId, consumptionSiteId, sk),
                data
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    delete: async (companyId, consumptionSiteId, sk) => {
        try {
            console.log('[ConsumptionUnitAPI] Deleting unit:', { companyId, consumptionSiteId, sk });
            const response = await api.delete(
                API_CONFIG.ENDPOINTS.CONSUMPTION.UNIT.DELETE(companyId, consumptionSiteId, sk)
            );
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

export default consumptionUnitApi;