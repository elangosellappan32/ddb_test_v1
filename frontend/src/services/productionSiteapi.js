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

const formatSiteData = (data) => {
  try {
    // Ensure we have the required fields
    if (!data || typeof data !== 'object') {
      console.warn('[ProductionSiteAPI] Invalid data object:', data);
      return null;
    }

    // Format and validate each field with strict type checking
    const formatted = {
      companyId: Number(data.companyId),
      productionSiteId: Number(data.productionSiteId),
      name: data.name?.toString().trim() || 'Unnamed Site',
      type: data.type?.toString().trim() || 'Unknown',
      location: data.location?.toString().trim() || 'Unknown Location',
      capacity_MW: Number(parseFloat(data.capacity_MW || 0)).toFixed(2),
      injectionVoltage_KV: Number(data.injectionVoltage_KV || 0),
      annualProduction_L: Number(data.annualProduction_L || 0),
      htscNo: data.htscNo ? Number(data.htscNo) : 0,
      banking: Number(data.banking || 0),
      status: ['Active', 'Inactive', 'Maintenance'].includes(data.status) ? data.status : 'Active',
      version: Number(data.version || 1),
      createdat: data.createdat || new Date().toISOString(),
      updatedat: data.updatedat || new Date().toISOString()
    };

    // Validate required fields after formatting
    if (isNaN(formatted.companyId) || isNaN(formatted.productionSiteId)) {
      console.warn('[ProductionSiteAPI] Invalid IDs:', {
        companyId: data.companyId,
        productionSiteId: data.productionSiteId
      });
      return null;
    }

    return formatted;
  } catch (error) {
    console.error('[ProductionSiteAPI] Error formatting site data:', error);
    return null;
  }
};

const validateResponse = (response) => {
  if (!response || typeof response !== 'object') {
    console.warn('[ProductionSiteAPI] Invalid response:', response);
    return [];
  }

  // Extract data array from response
  const data = response.success && Array.isArray(response.data) 
    ? response.data 
    : Array.isArray(response) ? response : [];

  console.log('[ProductionSiteAPI] Processing data array:', data);

  const validSites = data
    .map(site => formatSiteData(site))
    .filter(site => site !== null);

  console.log('[ProductionSiteAPI] Validated sites:', validSites);
  return validSites;
};

const productionSiteApi = {
  fetchAll: async (retries = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[ProductionSiteAPI] Fetching all sites (attempt ${attempt}/${retries})`);
        const response = await api.get(API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ALL);

        if (!response?.data) {
          throw new Error('Empty response received from server');
        }

        const validatedData = validateResponse(response.data);
        
        if (validatedData.length > 0) {
          console.log('[ProductionSiteAPI] Successfully retrieved sites:', validatedData);
          return {
            data: validatedData,
            total: validatedData.length
          };
        }

        if (attempt < retries) {
          console.log('[ProductionSiteAPI] No valid data found, retrying...');
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If we've exhausted all retries, return empty array instead of throwing
        return {
          data: [],
          total: 0
        };

      } catch (error) {
        lastError = error;
        console.error(`[ProductionSiteAPI] Fetch error (attempt ${attempt}/${retries}):`, error);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    console.error('[ProductionSiteAPI] All fetch attempts failed:', lastError);
    return {
      data: [],
      total: 0,
      error: lastError?.message || 'Failed to fetch production sites'
    };
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

      const response = await api.put(
        API_CONFIG.ENDPOINTS.PRODUCTION.SITE.UPDATE(1, productionSiteId),
        siteData
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  delete: async (companyId, productionSiteId, retries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Validate inputs
        if (!companyId || !productionSiteId) {
          throw new Error('Company ID and Production Site ID are required');
        }

        // For first attempt only, validate site exists
        if (attempt === 1) {
          const site = await productionSiteApi.fetchOne(companyId, productionSiteId);
          if (!site || !site.data) {
            throw new Error('Site not found');
          }
        }

        const response = await api.delete(
          API_CONFIG.ENDPOINTS.PRODUCTION.SITE.DELETE(companyId, productionSiteId)
        );

        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || 'Failed to delete site');
        }

        // Successful deletion
        console.log(`[ProductionSiteAPI] Site deleted successfully (attempt ${attempt})`);
        return response.data;
        
      } catch (error) {
        lastError = error;
        console.error(`[ProductionSiteAPI] Delete Error (attempt ${attempt}/${retries}):`, error);

        // Don't retry on these errors
        if (error.message?.includes('not found') || 
            error.message?.includes('permission') ||
            error.response?.status === 404 ||
            error.response?.status === 403) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all retries failed, throw the last error
    throw handleApiError(lastError);
  }
};

export default productionSiteApi;