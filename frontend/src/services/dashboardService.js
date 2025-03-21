import { API_CONFIG, API_BASE_URL } from '../config';
import api from './api';

export const fetchDashboardData = async () => {
  try {
    const [sites, units, charges] = await Promise.all([
      api.get(`${API_BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTION.SITES.GET_ALL}`),
      api.get(`${API_BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTION.UNITS.GET_ALL}`),
      api.get(`${API_BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTION.CHARGES.GET_ALL}`)
    ]);

    return {
      sites: sites.data || [],
      units: units.data || [],
      charges: charges.data || []
    };
  } catch (error) {
    console.error('Dashboard service error:', error);
    throw new Error('Failed to fetch dashboard data');
  }
};