import axios from 'axios';
import api from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3333/api';

const transformProductionData = (data) => {
  const items = Array.isArray(data) ? data :
    Array.isArray(data.data) ? data.data :
      [];

  return items.map(item => ({
    pk: item.pk,
    sk: item.sk,
    c1: Number(parseFloat(item.c1 || 0).toFixed(2)),
    c2: Number(parseFloat(item.c2 || 0).toFixed(2)),
    c3: Number(parseFloat(item.c3 || 0).toFixed(2)),
    c4: Number(parseFloat(item.c4 || 0).toFixed(2)),
    c5: Number(parseFloat(item.c5 || 0).toFixed(2)),
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

const formatProductionPayload = (data) => {
  if (!data) return null;

  const formatNumber = (value) => Number(parseFloat(value || 0).toFixed(2));

  return {
    sk: data.sk,
    c1: formatNumber(data.c1),
    c2: formatNumber(data.c2),
    c3: formatNumber(data.c3),
    c4: formatNumber(data.c4),
    c5: formatNumber(data.c5),
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
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false,
  timeout: 10000
});

apiInstance.interceptors.request.use(
  config => {
    console.log(`[ProductionAPI] ${config.method.toUpperCase()} Request:`, {
      url: config.url,
      data: config.data
    });
    return config;
  },
  error => {
    console.error('[ProductionAPI] Request Error:', error);
    return Promise.reject(error);
  }
);

apiInstance.interceptors.response.use(
  response => {
    console.log(`[ProductionAPI] Response from ${response.config.url}:`, response.data);
    return response;
  },
  error => {
    console.error(`[ProductionAPI] Error from ${error.config?.url}:`, error);
    return Promise.reject(error);
  }
);

const fetchProductionData = async () => {
  try {
    const response = await apiInstance.get('/production-unit');
    return response.data;
  } catch (error) {
    console.error('[ProductionAPI] Error fetching data:', error);
    throw new Error('Failed to fetch production data');
  }
};

const fetchProductionSiteHistory = async (companyId, productionSiteId) => {
  try {
    const response = await apiInstance.get(`/production-unit/${companyId}/${productionSiteId}`);
    const rawData = response.data?.data || response.data || [];
    return transformProductionData(rawData);
  } catch (error) {
    console.error('[ProductionAPI] Error fetching site history:', error);
    throw new Error('Failed to fetch site history');
  }
};

const createProductionData = async (companyId, productionSiteId, data) => {
  try {
    const selectedDate = new Date(data.selectedDate);
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    const sk = `${month}${year}`;

    const payload = {
      sk,
      c1: parseInt(data.c1) || 0,
      c2: parseInt(data.c2) || 0,
      c3: parseInt(data.c3) || 0,
      c4: parseInt(data.c4) || 0,
      c5: parseInt(data.c5) || 0,
      c001: parseInt(data.c001) || 0,
      c002: parseInt(data.c002) || 0,
      c003: parseInt(data.c003) || 0,
      c004: parseInt(data.c004) || 0,
      c005: parseInt(data.c005) || 0,
      c006: parseInt(data.c006) || 0,
      c007: parseInt(data.c007) || 0,
      c008: parseInt(data.c008) || 0,
      c009: parseInt(data.c009) || 0,
      c010: parseInt(data.c010) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeToLive: data.TimeToLive || 0,
      version: data.version || 1
    };

    console.log('[ProductionAPI] Creating production data:', { companyId, productionSiteId, ...payload });

    const response = await apiInstance.post(
      `/production-unit/${companyId}/${productionSiteId}`,
      payload
    );

    return response.data;
  } catch (error) {
    console.error('[ProductionAPI] Create error:', error);
    throw new Error('Failed to create production data');
  }
};

const updateProductionData = async (companyId, productionSiteId, data) => {
  try {
    if (!companyId || !productionSiteId || !data.sk) {
      throw new Error('Missing required fields: companyId, productionSiteId, or sk');
    }

    const payload = formatProductionPayload(data);
    payload.pk = `${companyId}_${productionSiteId}`;

    console.log('[ProductionAPI] Updating via API:', {
      url: `/production-unit/${companyId}/${productionSiteId}/${data.sk}`,
      payload
    });

    const response = await apiInstance.put(
      `/production-unit/${companyId}/${productionSiteId}/${data.sk}`,
      payload
    );

    console.log('[ProductionAPI] Update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[ProductionAPI] Update error:', error);
    throw new Error('Failed to update production data');
  }
};

const deleteProductionData = async (companyId, productionSiteId, sk) => {
  try {
    if (!companyId || !productionSiteId || !sk) {
      throw new Error('Missing required parameters: companyId, productionSiteId, or sk');
    }

    console.log('[ProductionAPI] Deleting production data:', {
      companyId,
      productionSiteId,
      sk
    });

    const response = await apiInstance.delete(`/production-unit/${companyId}/${productionSiteId}/${sk}`);

    console.log('[ProductionAPI] Delete successful');
    return response.data;
  } catch (error) {
    console.error('[ProductionAPI] Delete error:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete production data');
  }
};

export const productionApi = {
  fetchAll: async () => {
    try {
      const response = await apiInstance.get('/production-unit');
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('[ProductionAPI] Error fetching all data:', error);
      throw new Error('Failed to fetch production data');
    }
  },

  fetchHistory: async (companyId, productionSiteId) => {
    try {
      const response = await apiInstance.get(`/production-unit/${companyId}/${productionSiteId}`);
      const rawData = response.data?.data || response.data || [];
      return transformProductionData(rawData);
    } catch (error) {
      console.error('[ProductionAPI] Error fetching history:', error);
      throw new Error('Failed to fetch production history');
    }
  },

  create: async (companyId, productionSiteId, data) => {
    try {
      const payload = formatProductionPayload(data);
      const response = await apiInstance.post(
        `/production-unit/${companyId}/${productionSiteId}`,
        payload
      );
      return response.data;
    } catch (error) {
      console.error('[ProductionAPI] Create error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create production data');
    }
  },

  update: async (companyId, productionSiteId, data) => {
    try {
      if (!companyId || !productionSiteId || !data.sk) {
        throw new Error('Missing required fields');
      }

      const payload = formatProductionPayload(data);
      payload.pk = `${companyId}_${productionSiteId}`;

      console.log('[ProductionAPI] Updating via API:', {
        url: `/production-unit/${companyId}/${productionSiteId}/${data.sk}`,
        payload
      });

      const response = await apiInstance.put(
        `/production-unit/${companyId}/${productionSiteId}/${data.sk}`,
        payload
      );

      console.log('[ProductionAPI] Update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[ProductionAPI] Update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update production data');
    }
  },

  delete: async (companyId, productionSiteId, sk) => {
    try {
      const response = await apiInstance.delete(
        `/production-unit/${companyId}/${productionSiteId}/${sk}`
      );
      return response.data;
    } catch (error) {
      console.error('[ProductionAPI] Delete error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete production data');
    }
  },

  checkExisting: async (companyId, productionSiteId, date) => {
    try {
      console.log('[ProductionAPI] Checking existing data:', { companyId, productionSiteId, date });
      const response = await api.get(
        `/production-unit/${companyId}/${productionSiteId}/${date}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('[ProductionAPI] Check existing error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check existing data');
    }
  }
};

export {
  fetchProductionData,
  fetchProductionSiteHistory,
  createProductionData,
  updateProductionData,
  deleteProductionData
};