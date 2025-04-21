import api from '../utils/apiUtils';
import { API_CONFIG } from '../config/api.config';

const formatLapseData = (data) => ({
  ...data,
  c1: Number(data.c1 || 0),
  c2: Number(data.c2 || 0),
  c3: Number(data.c3 || 0),
  c4: Number(data.c4 || 0),
  c5: Number(data.c5 || 0)
});

const lapseApi = {
  fetchAll: async () => {
    try {
      const response = await api.get(API_CONFIG.LAPSE.GET_ALL);
      return {
        data: Array.isArray(response.data?.data) 
          ? response.data.data.map(formatLapseData)
          : []
      };
    } catch (error) {
      console.error('[LapseAPI] Fetch Error:', error);
      throw error;
    }
  },

  fetchOne: async (pk, sk) => {
    try {
      const response = await api.get(API_CONFIG.LAPSE.GET_ONE(pk, sk));
      return {
        data: formatLapseData(response.data?.data || response.data)
      };
    } catch (error) {
      console.error('[LapseAPI] Fetch One Error:', error);
      throw error;
    }
  }
};

export default lapseApi;
