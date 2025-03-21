import axios from 'axios';
import api from './api';
import { API_CONFIG } from '../config';

const { CHARGES } = API_CONFIG.ENDPOINTS.PRODUCTION;

const transformProductionChargeData = (data) => {
  const items = Array.isArray(data) ? data :
    Array.isArray(data.data) ? data.data : [];

  return items.map(item => ({
    pk: item.pk,
    sk: item.sk,
    c001: Number(parseFloat(item.c001 || 0).toFixed(2)),
    c002: Number(parseFloat(item.c002 || 0).toFixed(2)),
    c003: Number(parseFloat(item.c003 || 0).toFixed(2)),
    c004: Number(parseFloat(item.c004 || 0).toFixed(2)),
    c005: Number(parseFloat(item.c005 || 0).toFixed(2)),
    c006: Number(parseFloat(item.c006 || 0).toFixed(2)),
    c007: Number(parseFloat(item.c007 || 0).toFixed(2)),
    c008: Number(parseFloat(item.c008 || 0).toFixed(2)),
    c009: Number(parseFloat(item.c009 || 0).toFixed(2)),
    c010: Number(parseFloat(item.c010 || 0).toFixed(2))
  }));
};

const formatProductionChargePayload = (data) => {
  if (!data) return null;

  const formatNumber = (value) => Number(parseFloat(value || 0).toFixed(2));

  return {
    sk: data.sk,
    c001: formatNumber(data.c001),
    c002: formatNumber(data.c002),
    c003: formatNumber(data.c003),
    c004: formatNumber(data.c004),
    c005: formatNumber(data.c005),
    c006: formatNumber(data.c006),
    c007: formatNumber(data.c007),
    c008: formatNumber(data.c008),
    c009: formatNumber(data.c009),
    c010: formatNumber(data.c010),
    updatedAt: new Date().toISOString(),
    timeToLive: data.TimeToLive || 0,
    version: data.version || 1
  };
};

const apiInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false,
  timeout: 10000
});

// Request interceptor
apiInstance.interceptors.request.use(
  config => {
    console.log(`[ProductionChargeAPI] ${config.method.toUpperCase()} Request:`, {
      url: config.url,
      data: config.data
    });
    return config;
  },
  error => {
    console.error('[ProductionChargeAPI] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiInstance.interceptors.response.use(
  response => {
    console.log(`[ProductionChargeAPI] Response from ${response.config.url}:`, response.data);
    return response;
  },
  error => {
    console.error(`[ProductionChargeAPI] Error from ${error.config?.url}:`, error);
    return Promise.reject(error);
  }
);

export const fetchProductionChargeData = async (siteId = null) => {
  try {
    const endpoint = siteId 
      ? `${API_CONFIG.ENDPOINTS.PRODUCTION.CHARGES.GET_BY_SITE(siteId)}`
      : API_CONFIG.ENDPOINTS.PRODUCTION.CHARGES.GET_ALL;

    const response = await api.get(endpoint);
    const transformedData = transformProductionChargeData(response.data);
    
    console.log('[ProductionChargeAPI] Fetched and transformed data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('[ProductionChargeAPI] Error fetching data:', error);
    throw new Error('Failed to fetch production charge data');
  }
};

const fetchProductionChargeHistory = async (companyId, productionSiteId) => {
  try {
    const response = await apiInstance.get(`/production-charge/${companyId}/${productionSiteId}`);
    const rawData = response.data?.data || response.data || [];
    return transformProductionChargeData(rawData);
  } catch (error) {
    console.error('[ProductionChargeAPI] Error fetching site history:', error);
    throw new Error('Failed to fetch charge site history');
  }
};

const createProductionChargeData = async (companyId, productionSiteId, data) => {
  try {
    const selectedDate = new Date(data.selectedDate);
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    const sk = `${month}${year}`;

    const payload = {
      sk,
      ...formatProductionChargePayload(data),
      createdAt: new Date().toISOString()
    };

    const response = await apiInstance.post(
      `/production-charge/${companyId}/${productionSiteId}`,
      payload
    );

    return response.data;
  } catch (error) {
    console.error('[ProductionChargeAPI] Create error:', error);
    throw new Error('Failed to create production charge data');
  }
};

const updateProductionChargeData = async (companyId, productionSiteId, data) => {
  try {
    if (!companyId || !productionSiteId || !data.sk) {
      throw new Error('Missing required fields: companyId, productionSiteId, or sk');
    }

    const payload = formatProductionChargePayload(data);
    payload.pk = `${companyId}_${productionSiteId}`;

    const response = await apiInstance.put(
      `/production-charge/${companyId}/${productionSiteId}/${data.sk}`,
      payload
    );

    return response.data;
  } catch (error) {
    console.error('[ProductionChargeAPI] Update error:', error);
    throw new Error('Failed to update production charge data');
  }
};

const deleteProductionChargeData = async (companyId, productionSiteId, sk) => {
  try {
    if (!companyId || !productionSiteId || !sk) {
      throw new Error('Missing required parameters: companyId, productionSiteId, or sk');
    }

    const response = await apiInstance.delete(
      `/production-charge/${companyId}/${productionSiteId}/${sk}`
    );

    return response.data;
  } catch (error) {
    console.error('[ProductionChargeAPI] Delete error:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete production charge data');
  }
};

const transformChargeData = (data) => ({
  companyId: data.companyId,
  productionSiteId: data.productionSiteId,
  month: data.month,
  charges: Object.keys(data)
    .filter(key => key.startsWith('c') && !isNaN(data[key]))
    .reduce((acc, key) => ({
      ...acc,
      [key]: Number(parseFloat(data[key] || 0).toFixed(2))
    }), {}),
  version: data.version || 1
});

export const productionChargeApi = {
  fetchAll: async () => {
    try {
      const response = await api.get(CHARGES.GET_ALL);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[DB] Error fetching charges:', error);
      throw new Error('Failed to fetch production charges');
    }
  },

  fetchBySite: async (companyId, productionSiteId) => {
    try {
      const response = await api.get(CHARGES.GET_BY_SITE(companyId, productionSiteId));
      return response.data;
    } catch (error) {
      console.error('[DB] Error fetching site charges:', error);
      throw new Error('Failed to fetch site production charges');
    }
  },

  create: async (data) => {
    try {
      const transformed = transformChargeData(data);
      const response = await api.post(CHARGES.CREATE, transformed);
      return response.data;
    } catch (error) {
      console.error('[DB] Error creating charge:', error);
      throw new Error('Failed to create production charge');
    }
  },

  update: async (companyId, productionSiteId, data) => {
    try {
      const transformed = transformChargeData(data);
      const response = await api.put(
        CHARGES.UPDATE(companyId, productionSiteId),
        transformed
      );
      return response.data;
    } catch (error) {
      console.error('[DB] Error updating charge:', error);
      throw new Error('Failed to update production charge');
    }
  },

  delete: async (companyId, productionSiteId) => {
    try {
      await api.delete(CHARGES.DELETE(companyId, productionSiteId));
      return true;
    } catch (error) {
      console.error('[DB] Error deleting charge:', error);
      throw new Error('Failed to delete production charge');
    }
  }
};

export {
  fetchProductionChargeHistory,
  createProductionChargeData,
  updateProductionChargeData,
  deleteProductionChargeData
};