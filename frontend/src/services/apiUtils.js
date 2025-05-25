import axios from 'axios';
import { API_BASE_URL, API_CONFIG, API_HEADERS } from '../config/api.config';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3333',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  paramsSerializer: {
    encode: (param) => param // Prevent default URL encoding
  }
});


api.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
);

export const handleApiError = (error) => {
  console.log('[API Error Details]:', error);
  return error;
};

export default api;