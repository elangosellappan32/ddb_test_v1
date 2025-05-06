import axios from 'axios';

const API_BASE_URL = 'http://localhost:3333/api';

export const fetchReportDataByFinancialYear = async (financialYear) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health/formva`, {
      params: { financialYear },
    });
    return response.data; // Return the entire response since metrics are at root level
  } catch (error) {
    console.error('Error fetching report data:', error);
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || 'Invalid financial year format');
    }
    throw new Error('Failed to fetch report data');
  }
};