import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const handleApiError = (error) => {
  console.error('API Error:', error);
  throw new Error(error.response?.data?.message || error.message || 'An error occurred');
};

const generatePK = (companyId, productionSiteId) => `${companyId}_${productionSiteId}`;

const formatDateToMMYYYY = (date) => {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
};

const formatSiteData = (data) => ({
  companyId: Number(data.companyId) || 1,
  productionSiteId: Number(data.productionSiteId),
  name: data.name,
  type: data.type,
  location: data.location,
  capacity_MW: Number(data.capacity_MW),
  injectionVoltage_KV: Number(data.injectionVoltage_KV),
  annualProduction_L: Number(data.annualProduction), // Match the backend field name
  htscNo: data.htscNo,
  banking: Number(data.banking),
  status: data.status || 'Active',
  version: Number(data.version) || 1
});

const productionSiteApi = {
  fetchAll: async () => {
    try {
      console.log('[ProductionSiteAPI] Fetching all sites');
      const response = await api.get(API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ALL);
      return {
        data: Array.isArray(response.data) ? response.data.map(formatSiteData) : []
      };
    } catch (error) {
      console.error('[ProductionSiteAPI] Error:', error);
      throw error;
    }
  },

  fetchOne: async (companyId, productionSiteId) => {
    try {
      console.log('[ProductionSiteAPI] Fetching site:', { companyId, productionSiteId });
      const response = await api.get(
        API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ONE(companyId, productionSiteId)
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async (data) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ALL);
      const existingSites = response.data || [];
      const nextSiteId = existingSites.length + 1;

      // Transform the data before sending to API
      const siteData = {
        ...formatSiteData(data),
        companyId: 1,
        productionSiteId: nextSiteId,
        pk: generatePK(1, nextSiteId),
        sk: formatDateToMMYYYY(new Date()),
        type: 'SITE',
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
        version: 1
      };

      console.log('[ProductionSiteAPI] Creating site:', siteData);
      const createResponse = await api.post(API_CONFIG.ENDPOINTS.PRODUCTION.SITE.CREATE, siteData);
      return createResponse.data;
    } catch (error) {
      if (error.response?.status === 400) {
        // Add specific error handling for validation errors
        const errorMessage = error.response.data?.message || 'Validation failed';
        throw new Error(errorMessage);
      }
      return handleApiError(error);
    }
  },

  update: async (companyId, productionSiteId, data) => {
    try {
      const siteData = {
        ...data,
        companyId: 1,
        productionSiteId,
        pk: generatePK(1, productionSiteId),
        sk: formatDateToMMYYYY(new Date()),
        updatedat: new Date().toISOString()
      };

      console.log('[ProductionSiteAPI] Updating site:', { companyId: 1, productionSiteId, siteData });
      const response = await api.put(
        API_CONFIG.ENDPOINTS.PRODUCTION.SITE.UPDATE(1, productionSiteId),
        siteData
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async (companyId, productionSiteId) => {
    try {
      console.log('[ProductionSiteAPI] Deleting site:', { companyId: 1, productionSiteId });
      const response = await api.delete(
        API_CONFIG.ENDPOINTS.PRODUCTION.SITE.DELETE(1, productionSiteId)
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

export default productionSiteApi;