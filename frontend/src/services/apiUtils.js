import axios from 'axios';
import { API_BASE_URL, API_CONFIG } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export const handleApiError = (error) => {
  console.error('[API Error Details]:', {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message
  });

  if (error.response?.status === 500) {
    throw new Error('Server error occurred. Please try again.');
  }

  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }

  if (error.response) {
    throw new Error(`Request failed (${error.response.status})`);
  }

  if (error.request) {
    throw new Error('Network error. Please check your connection.');
  }

  throw new Error(error.message || 'An unexpected error occurred');
};

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('[API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(handleApiError(error));
  }
);

export default api;