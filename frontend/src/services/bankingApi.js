import api, { handleApiError } from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const formatDateToMMYYYY = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${year}`;
};

const formatBankingData = (record) => ({
    ...record,
    c1: Number(record.c1 || 0),
    c2: Number(record.c2 || 0),
    c3: Number(record.c3 || 0),
    c4: Number(record.c4 || 0),
    c5: Number(record.c5 || 0),
    totalBanking: Number(record.totalBanking || 0),
    siteName: record.siteName || ''
});

const bankingApi = {
    fetchAll: async () => {
        try {
            console.log('[BankingAPI] Fetching all banking records');
            const response = await api.get(API_CONFIG.ENDPOINTS.BANKING.GET_ALL);
            return {
                data: Array.isArray(response.data?.data) ? response.data.data.map(formatBankingData) : []
            };
        } catch (error) {
            throw handleApiError(error);
        }
    },

    fetchOne: async (pk, sk) => {
        try {
            console.log('[BankingAPI] Fetching banking record:', { pk, sk });
            const response = await api.get(API_CONFIG.ENDPOINTS.BANKING.GET_ONE(pk, sk));
            return {
                data: formatBankingData(response.data)
            };
        } catch (error) {
            throw handleApiError(error);
        }
    },

    fetchByPeriod: async (pk, period) => {
        try {
            console.log('[BankingAPI] Fetching banking by period:', { pk, period });
            const response = await api.get(API_CONFIG.ENDPOINTS.BANKING.GET_BY_PERIOD(pk, period));
            return {
                data: Array.isArray(response.data?.data) ? response.data.data.map(formatBankingData) : []
            };
        } catch (error) {
            throw handleApiError(error);
        }
    },

    create: async (data) => {
        try {
            const bankingData = {
                ...data,
                sk: formatDateToMMYYYY(data.date),
                c1: Number(data.c1 || 0),
                c2: Number(data.c2 || 0),
                c3: Number(data.c3 || 0),
                c4: Number(data.c4 || 0),
                c5: Number(data.c5 || 0),
                version: 1
            };

            console.log('[BankingAPI] Creating banking record:', bankingData);
            const response = await api.post(API_CONFIG.ENDPOINTS.BANKING.CREATE, bankingData);
            return formatBankingData(response.data);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    update: async (pk, sk, data) => {
        try {
            const bankingData = {
                ...data,
                c1: Number(data.c1 || 0),
                c2: Number(data.c2 || 0),
                c3: Number(data.c3 || 0),
                c4: Number(data.c4 || 0),
                c5: Number(data.c5 || 0)
            };

            console.log('[BankingAPI] Updating banking record:', { pk, sk, data: bankingData });
            const response = await api.put(
                API_CONFIG.ENDPOINTS.BANKING.UPDATE(pk, sk),
                bankingData
            );
            return formatBankingData(response.data);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    delete: async (pk, sk) => {
        try {
            console.log('[BankingAPI] Deleting banking record:', { pk, sk });
            const response = await api.delete(API_CONFIG.ENDPOINTS.BANKING.DELETE(pk, sk));
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

export default bankingApi;