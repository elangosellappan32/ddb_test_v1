import api, { handleApiError } from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const generatePK = (companyId, productionSiteId) => `${companyId}_${productionSiteId}`;

const formatDateToMMYYYY = (date) => {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
};

const productionSiteApi = {
  fetchAll: async () => {
    try {
      console.log('[ProductionSiteAPI] Fetching all sites');
      const response = await api.get(API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ALL);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
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
      // First fetch all sites to determine next productionSiteId
      const response = await api.get(API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ALL);
      const existingSites = response.data || [];
      const nextSiteId = existingSites.length + 1;

      const siteData = {
        ...data,
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
      throw handleApiError(error);
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
      throw handleApiError(error);
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
      throw handleApiError(error);
    }
  }
};

export default productionSiteApi;