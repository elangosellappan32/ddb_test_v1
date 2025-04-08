import axios from 'axios';
import { API_BASE_URL, API_CONFIG, API_HEADERS } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_HEADERS
});

export const handleApiError = (error) => {
  console.log('[API Error Details]:', error);

  if (error.response?.status === 404) {
    return new Error('Resource not found - Please check the URL parameters');
  }

  return error;
};

export default api;