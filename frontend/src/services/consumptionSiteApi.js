import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const handleApiError = (error) => {
  console.error('[ConsumptionSiteAPI] Error:', error);
  throw new Error(error.response?.data?.message || error.message || 'An error occurred');
};

const formatSiteData = (data) => {
  try {
    // Ensure we have the required fields
    if (!data || typeof data !== 'object') {
      console.warn('[ConsumptionSiteAPI] Invalid data object:', data);
      return null;
    }
    
    // Handle annual consumption from different possible field names
    let annualConsumption = 0;
    const rawValue = data.annualConsumption ?? data.annualConsumption_L ?? data.annualConsumption_N?.N;
    
    if (rawValue !== undefined && rawValue !== null) {
      if (typeof rawValue === 'number') {
        annualConsumption = Math.round(Number(rawValue));
      } else if (typeof rawValue === 'string') {
        const cleanValue = rawValue.trim() === '' ? '0' : rawValue.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleanValue);
        annualConsumption = isNaN(num) ? 0 : Math.round(num);
      } else if (typeof rawValue === 'object' && rawValue.N) {
        const num = parseFloat(rawValue.N);
        annualConsumption = isNaN(num) ? 0 : Math.round(num);
      }
    }
    
    // Format and validate each field with strict type checking
    const formatted = {
      companyId: String(data.companyId || '1'),
      consumptionSiteId: String(data.consumptionSiteId || '1'),
      name: data.name?.toString().trim() || 'Unnamed Site',
      type: data.type?.toString().trim() || 'Industry',
      location: data.location?.toString().trim() || 'Unknown Location',
      annualConsumption: annualConsumption,
      annualConsumption_L: annualConsumption, // Keep both for backward compatibility
      htscNo: data.htscNo ? String(data.htscNo).trim() : '',
      status: ['Active', 'Inactive', 'Maintenance'].includes(data.status) ? data.status : 'Active',
      version: Number(data.version || 1),
      createdat: data.createdat || new Date().toISOString(),
      updatedat: data.updatedat || new Date().toISOString()
    };    // Validate required fields after formatting
    if (!formatted.companyId || !formatted.consumptionSiteId) {
      console.warn('[ConsumptionSiteAPI] Missing required IDs:', {
        companyId: data.companyId,
        consumptionSiteId: data.consumptionSiteId
      });
      return null;
    }

    return formatted;
  } catch (error) {
    console.error('[ConsumptionSiteAPI] Error formatting site data:', error);
    return null;
  }
};

// Cache for storing consumption sites data
const siteCache = {
  data: [],
  lastUpdated: null,
  isUpdating: false
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

class ConsumptionSiteApi {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.fetchAll = this.fetchAll.bind(this);
    this.fetchOne = this.fetchOne.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async fetchAll(forceRefresh = false, retries = 3, delay = 1000) {
    try {
      // Return cached data if available and fresh
      if (!forceRefresh && 
          siteCache.data.length > 0 && 
          siteCache.lastUpdated && 
          (Date.now() - siteCache.lastUpdated) < CACHE_TTL) {
        return {
          success: true,
          data: [...siteCache.data],
          total: siteCache.data.length,
          fromCache: true
        };
      }

      // If a refresh is already in progress, wait for it
      if (siteCache.isUpdating) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchAll(forceRefresh, retries - 1);
      }

      siteCache.isUpdating = true;
      const response = await api.get(API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ALL);
      
      let sites = [];
      if (Array.isArray(response?.data?.data)) {
        sites = response.data.data;
      } else if (Array.isArray(response?.data)) {
        sites = response.data;
      } else if (response?.data) {
        sites = [response.data];
      }

      // Format and validate sites
      const formattedSites = sites
        .map(site => formatSiteData(site))
        .filter(site => site !== null);

      // Update cache
      siteCache.data = formattedSites;
      siteCache.lastUpdated = Date.now();
      siteCache.isUpdating = false;

      return {
        success: true,
        data: [...formattedSites],
        total: formattedSites.length,
        fromCache: false
      };

    } catch (error) {
      siteCache.isUpdating = false;
      return handleApiError(error);
    }
  }

  async fetchOne(companyId, consumptionSiteId) {
    try {
      console.log('[ConsumptionSiteAPI] Fetching site:', { companyId, consumptionSiteId });
      const response = await api.get(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.GET_ONE(companyId, consumptionSiteId)
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  async create(data, authContext) {
    try {
      console.log('[ConsumptionSiteAPI] Received create request with data:', data);
      
      // Set environment
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      
      // Get company ID from multiple sources in order of precedence
      let companyId = data.companyId;
      
      if (!companyId && authContext?.user) {
        // Try to get companyId from different possible locations in auth context
        const sources = [
          { value: authContext.user.companyId, source: 'user.companyId' },
          { value: authContext.user.metadata?.companyId, source: 'user.metadata.companyId' }
        ];

        if (authContext.user.accessibleSites?.consumptionSites?.L?.length > 0) {
          const firstSiteId = authContext.user.accessibleSites.consumptionSites.L[0].S;
          const siteCompanyId = parseInt(firstSiteId.split('_')[0], 10);
          if (!isNaN(siteCompanyId)) {
            sources.push({ value: siteCompanyId, source: 'user.accessibleSites[0]' });
          }
        }

        console.log('[ConsumptionSiteAPI] Auth context:', {
          user: authContext.user,
          metadata: authContext.user.metadata,
          isDevelopment
        });

        for (const source of sources) {
          if (source.value) {
            companyId = source.value;
            console.log(`[ConsumptionSiteAPI] Using companyId from ${source.source}:`, companyId);
            break;
          }
        }
      }

      // If no company ID found and we're in development, use default
      if (!companyId && isDevelopment) {
        companyId = 1;
        console.log('[ConsumptionSiteAPI] Using default development companyId:', companyId);
      }

      // Validate company ID
      if (companyId) {
        companyId = String(companyId);
        if (!companyId) {
          if (isDevelopment) {
            companyId = '1';
            console.log('[ConsumptionSiteAPI] Invalid company ID, using default in development:', companyId);
          } else {
            throw new Error('Invalid company ID format');
          }
        }
      } else {
        const error = new Error('No company association found. Please contact your administrator to set up your company association.');
        error.code = 'NO_COMPANY_ASSOCIATION';
        error.details = {
          environment: process.env.NODE_ENV,
          user: authContext?.user?.username,
          metadata: authContext?.user?.metadata
        };
        throw error;
      }

      // Get next available consumptionSiteId
      const currentSites = await this.fetchAll(true);
      const existingSiteIds = currentSites.data
        .filter(site => site.companyId === companyId)
        .map(site => Number(site.consumptionSiteId) || 0);

      const nextSiteId = existingSiteIds.length > 0 ? Math.max(...existingSiteIds) + 1 : 1;

      // Prepare the site data with proper formatting
      const siteData = {
        ...data,
        companyId: String(companyId),
        consumptionSiteId: String(nextSiteId),
        name: String(data.name || '').trim(),
        type: String(data.type || 'Industry').trim(),
        location: String(data.location || '').trim(),
        drawalVoltage_KV: Number(data.drawalVoltage_KV || 0),
        contractDemand_KVA: Number(data.contractDemand_KVA || 0),
        annualConsumption_L: Number(data.annualConsumption_L || 0),
        htscNo: data.htscNo ? String(data.htscNo).trim() : '',
        status: String(data.status || 'Active').trim(),
        description: data.description ? String(data.description).trim() : '',
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
        version: 1
      };

      console.log('[ConsumptionSiteAPI] Creating consumption site with:', siteData);

      const response = await api.post(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.CREATE,
        siteData
      );

      console.log('[ConsumptionSiteAPI] Consumption site created:', response.data);
      
      // Schedule a refresh of all sites data after 3 seconds
      setTimeout(() => {
        console.log('[ConsumptionSiteAPI] Refreshing sites data after creation...');
        this.fetchAll(true).catch(err => {
          console.error('[ConsumptionSiteAPI] Error refreshing sites:', err);
        });
      }, 3000);

      return response.data;

    } catch (error) {
      // Handle development mode retry
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      // If it's a company association error in development, retry with default company
      if (error.code === 'NO_COMPANY_ASSOCIATION' && isDevelopment) {
        console.warn('[ConsumptionSiteAPI] No company association found, retrying with default company in development');
        return this.create({ ...data, companyId: '1' }, authContext);
      }
      
      // For other errors, format them properly
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message ||
                         'Failed to create consumption site';
      const serverError = new Error(errorMessage);
      serverError.status = error.response?.status;
      serverError.details = {
        ...error.response?.data,
        originalError: error.message,
        environment: process.env.NODE_ENV
      };
      serverError.code = error.code || error.response?.data?.code;
      throw serverError;
    }
  }

  async update(companyId, consumptionSiteId, data) {
    try {
      if (!companyId) {
        throw new Error('Company ID is required to update a consumption site');
      }

      // Handle annual consumption from different possible field names
      let annualConsumption = 0;
      const rawValue = data.annualConsumption ?? data.annualConsumption_L;
      
      if (rawValue !== undefined && rawValue !== null) {
        if (typeof rawValue === 'number') {
          annualConsumption = Math.round(Number(rawValue));
        } else if (typeof rawValue === 'string') {
          const cleanValue = rawValue.trim() === '' ? '0' : rawValue.replace(/[^0-9.]/g, '');
          const num = parseFloat(cleanValue);
          annualConsumption = isNaN(num) ? 0 : Math.round(num);
        } else if (typeof rawValue === 'object' && rawValue.N) {
          const num = parseFloat(rawValue.N);
          annualConsumption = isNaN(num) ? 0 : Math.round(num);
        }
      }

      const siteData = {
        ...data,
        companyId: String(companyId),
        consumptionSiteId: String(consumptionSiteId),
        annualConsumption: annualConsumption,
        annualConsumption_L: annualConsumption, // Keep both for backward compatibility
        updatedat: new Date().toISOString()
      };

      const response = await api.put(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.UPDATE(companyId, consumptionSiteId),
        siteData
      );

      // Schedule a refresh of all sites data after 3 seconds
      setTimeout(() => {
        console.log('[ConsumptionSiteAPI] Refreshing sites data after update...');
        this.fetchAll(true).catch(err => {
          console.error('[ConsumptionSiteAPI] Error refreshing sites:', err);
        });
      }, 3000);

      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  async delete(companyId, consumptionSiteId) {
    try {
      if (!companyId || !consumptionSiteId) {
        throw new Error('Company ID and Consumption Site ID are required');
      }

      const response = await api.delete(
        API_CONFIG.ENDPOINTS.CONSUMPTION.SITE.DELETE(companyId, consumptionSiteId)
      );

      // Schedule a refresh of all sites data after 3 seconds
      setTimeout(() => {
        console.log('[ConsumptionSiteAPI] Refreshing sites data after deletion...');
        this.fetchAll(true).catch(err => {
          console.error('[ConsumptionSiteAPI] Error refreshing sites:', err);
        });
      }, 3000);

      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
}

const consumptionSiteApi = new ConsumptionSiteApi();
export default consumptionSiteApi;