import api, { handleApiError } from './apiUtils';
import { API_CONFIG } from '../config/api.config';
import { withRetry, defaultShouldRetry } from './retryService';

const generatePK = (companyId, consumptionSiteId) => `${companyId}_${consumptionSiteId}`;

const formatDateToMMYYYY = (date) => {
  const d = new Date(date);
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
};

const formatSiteName = (name) => {
  if (!name || typeof name !== 'string') return 'Unnamed Site';
  return name.trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatSiteData = (data) => ({
  companyId: String(data.companyId || '1'),
  consumptionSiteId: String(data.consumptionSiteId),
  name: formatSiteName(data.name),
  type: (data.type || 'unknown').toLowerCase(),
  location: data.location?.trim() || 'Location not specified',
  annualConsumption: Number(data.annualConsumption || 0),
  status: (data.status || 'inactive').toLowerCase(),
  version: Number(data.version || 1),
  timetolive: Number(data.timetolive || 0),
  createdat: data.createdat || new Date().toISOString(),
  updatedat: data.updatedat || new Date().toISOString()
});

const consumptionSiteApi = {
  fetchAll: async () => {
    try {
      console.log('[ConsumptionSiteAPI] Fetching all sites');
      const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
      return {
        data: Array.isArray(response.data?.data) 
          ? response.data.data.map(formatSiteData) 
          : []
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  fetchOne: async (companyId, consumptionSiteId) => {
    try {
      const response = await api.get(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ONE(companyId, consumptionSiteId)
      );
      
      if (!response.data?.data && !response.data) {
        throw new Error('Site not found');
      }
      
      const siteData = response.data?.data || response.data;
      
      // Validate required fields
      if (!siteData.name || !siteData.type || !siteData.location) {
        console.error('[ConsumptionSiteAPI] Invalid site data:', siteData);
        throw new Error('Invalid site data received from server');
      }
      
      return {
        data: {
          ...siteData,
          companyId: String(siteData.companyId || '1'),
          consumptionSiteId: String(siteData.consumptionSiteId),
          name: siteData.name,
          type: siteData.type.toLowerCase(),
          location: siteData.location,
          annualConsumption: Number(siteData.annualConsumption || 0),
          status: (siteData.status || 'inactive').toLowerCase(),
          version: Number(siteData.version || 1),
          timetolive: Number(siteData.timetolive || 0),
          createdat: siteData.createdat || new Date().toISOString(),
          updatedat: siteData.updatedat || new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[ConsumptionSiteAPI] Fetch Error:', error);
      throw handleApiError(error);
    }
  },

  create: async (data) => {
    try {
      const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
      const existingSites = response.data?.data || [];
      const nextSiteId = String(existingSites.length + 1);

      const siteData = {
        ...data,
        companyId: '1',
        consumptionSiteId: nextSiteId,
        type: data.type || 'industrial',
        status: data.status || 'active',
        version: 1,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      };

      console.log('[ConsumptionSiteAPI] Creating site:', siteData);
      const createResponse = await api.post(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.CREATE,
        siteData
      );
      return createResponse.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  update: async (companyId, consumptionSiteId, data) => {
    try {
      const updateData = {
        name: data.name,
        type: data.type,
        location: data.location,
        annualConsumption: Number(data.annualConsumption),
        status: data.status || 'active',
        version: Number(data.version || 1),
        timetolive: Number(data.timetolive || 0),
        updatedat: new Date().toISOString()
      };

      console.log('[ConsumptionSiteAPI] Updating site:', { companyId, consumptionSiteId, updateData });
      const response = await api.put(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.UPDATE(companyId, consumptionSiteId),
        updateData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },  delete: async (companyId, consumptionSiteId) => {
    if (!companyId || !consumptionSiteId) {
      throw new Error('Company ID and Consumption Site ID are required');
    }

    return withRetry(async (attempt) => {
      // On first attempt, verify the site exists and is accessible
      if (attempt === 1) {
        const site = await consumptionSiteApi.fetchOne(companyId, consumptionSiteId);
        if (!site?.data) {
          throw new Error('Site not found');
        }
      }

      console.log(`[ConsumptionSiteAPI] Deleting site (attempt ${attempt}):`, {
        companyId,
        consumptionSiteId
      });

      const response = await api.delete(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.DELETE(companyId, consumptionSiteId)
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to delete site');
      }

      console.log('[ConsumptionSiteAPI] Site deletion successful');
      return response.data;
    }, {
      retries: 3,
      shouldRetry: defaultShouldRetry,
      onRetry: (attempt, error) => {
        console.log(`[ConsumptionSiteAPI] Retrying delete operation (attempt ${attempt}):`, error);
      }
    });
  }
};

export default consumptionSiteApi;