import axios from 'axios';
import { API_BASE_URL, API_CONFIG, API_HEADERS } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_HEADERS,
  paramsSerializer: {
    encode: (param) => param // Prevent default URL encoding
  }
});

// Add response interceptor to handle common error cases
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 404) {
      throw new Error('Resource not found - Please check the URL parameters');
    }
    throw error;
  }
);

export const handleApiError = (error) => {
  console.log('[API Error Details]:', error);
  return error;
};

export default api;