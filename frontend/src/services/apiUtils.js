import axios from 'axios';
import { API_BASE_URL, API_CONFIG, API_HEADERS } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_HEADERS
});

export const handleApiError = (error) => {
  const errorDetails = {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    details: error.response?.data?.details || error.response?.data?.message
  };
  
  console.error('[API Error Details]:', errorDetails);

  // Handle specific DynamoDB errors
  if (error.message?.includes('ValidationException')) {
    throw new Error('Data validation failed. Please check your input values.');
  }

  switch (error.response?.status) {
    case 400:
      throw new Error('Invalid request data. Please check your input.');
    case 404:
      throw new Error('Resource not found.');
    case 409:
      throw new Error('Version conflict. Please refresh and try again.');
    case 500:
      throw new Error('Server error. Please try again later.');
    default:
      throw new Error(error.message || 'An unexpected error occurred.');
  }
};

export default api;