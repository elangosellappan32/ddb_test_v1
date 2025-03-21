import axios from 'axios';
import { API_CONFIG } from '../config';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3333';

const apiInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const { UNIT } = API_CONFIG.ENDPOINTS.PRODUCTION;

export const fetchProductionData = async (companyId, productionSiteId) => {
  try {
    const response = await apiInstance.get(UNIT.GET_ONE(companyId, productionSiteId));
    return response.data;
  } catch (error) {
    console.error('[ProductionUnitAPI] Fetch error:', error);
    throw new Error('Failed to fetch production data');
  }
};

export const createProductionData = async (data) => {
  try {
    const response = await apiInstance.post(UNIT.CREATE, data);
    return response.data;
  } catch (error) {
    console.error('[ProductionUnitAPI] Create error:', error);
    throw new Error('Failed to create production data');
  }
};

export const updateProductionData = async (companyId, productionSiteId, data) => {
  try {
    const response = await apiInstance.put(UNIT.UPDATE(companyId, productionSiteId), data);
    return response.data;
  } catch (error) {
    console.error('[ProductionUnitAPI] Update error:', error);
    throw new Error('Failed to update production data');
  }
};

export const deleteProductionData = async (companyId, productionSiteId) => {
  try {
    const response = await apiInstance.delete(UNIT.DELETE(companyId, productionSiteId));
    return response.data;
  } catch (error) {
    console.error('[ProductionUnitAPI] Delete error:', error);
    throw new Error('Failed to delete production data');
  }
};

const productionUnitApi = {
  fetchData: fetchProductionData,
  create: createProductionData,
  update: updateProductionData,
  delete: deleteProductionData
};

export default productionUnitApi;