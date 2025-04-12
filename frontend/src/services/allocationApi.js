import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const formatDateToMMYYYY = (dateString) => {
    try {
        if (!dateString) {
            const date = new Date();
            return `${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
        }
        
        // If already in MMYYYY format
        if (dateString.length === 6 && !dateString.includes('-')) {
            // Validate the month part is between 01-12
            const month = parseInt(dateString.substring(0, 2));
            if (month >= 1 && month <= 12) {
                return dateString;
            }
            throw new Error('Invalid month value in MMYYYY format');
        }
        
        // Handle YYYY-MM format
        if (dateString.includes('-')) {
            const [yearStr, monthStr] = dateString.split('-');
            if (!yearStr || !monthStr || yearStr.length !== 4) {
                throw new Error('Invalid YYYY-MM format');
            }
            return `${monthStr}${yearStr}`;
        }
        
        throw new Error('Invalid date format. Expected YYYY-MM or MMYYYY');
    } catch (error) {
        console.error('[AllocationAPI] Date format error:', error);
        throw new Error('Invalid date format. Expected YYYY-MM or MMYYYY');
    }
};

const formatAllocationData = (data) => ({
    ...data,
    amount: Number(data.amount || 0),
    version: Number(data.version || 1),
    isBanking: Boolean(data.isBanking),
    c1: Number(data.c1 || 0),
    c2: Number(data.c2 || 0),
    c3: Number(data.c3 || 0),
    c4: Number(data.c4 || 0),
    c5: Number(data.c5 || 0)
});

const allocationApi = {
    fetchAll: async (month) => {
        try {
            console.log('[AllocationAPI] Fetching all allocations for month:', month);
            const formattedMonth = formatDateToMMYYYY(month);
            const response = await api.get(
                API_CONFIG.ENDPOINTS.ALLOCATION.GET_ALL(formattedMonth)
            );
            
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to fetch allocations');
            }
            
            return {
                success: true,
                data: Array.isArray(response.data?.data) 
                    ? response.data.data.map(formatAllocationData) 
                    : []
            };
        } catch (error) {
            console.error('[AllocationAPI] Fetch Error:', error);
            throw error;
        }
    },

    fetchByPeriod: async (period, month) => {
        try {
            console.log('[AllocationAPI] Fetching allocations by period:', { period, month });
            const formattedMonth = formatDateToMMYYYY(month);
            const response = await api.get(
                API_CONFIG.ENDPOINTS.ALLOCATION.GET_BY_PERIOD(period.toUpperCase(), formattedMonth)
            );
            return {
                success: true,
                data: Array.isArray(response.data?.data) 
                    ? response.data.data.map(formatAllocationData)
                    : []
            };
        } catch (error) {
            console.error('[AllocationAPI] Fetch by period Error:', error);
            throw error;
        }
    },

    create: async (data) => {
        try {
            console.log('[AllocationAPI] Creating allocation:', data);
            const formattedData = {
                ...data,
                month: formatDateToMMYYYY(data.month)
            };
            
            const response = await api.post(
                API_CONFIG.ENDPOINTS.ALLOCATION.CREATE,
                formattedData
            );
            
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to create allocation');
            }
            
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Create Error:', error);
            throw error;
        }
    },

    createBatch: async (allocations) => {
        try {
            console.log('[AllocationAPI] Creating batch allocations:', allocations);
            const formattedAllocations = allocations.map(allocation => ({
                ...allocation,
                month: formatDateToMMYYYY(allocation.month)
            }));
            
            const response = await api.post(
                API_CONFIG.ENDPOINTS.ALLOCATION.CREATE_BATCH,
                formattedAllocations
            );
            
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to create batch allocations');
            }
            
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Batch Create Error:', error);
            throw error;
        }
    },

    update: async (pk, sk, data) => {
        try {
            console.log('[AllocationAPI] Updating allocation:', { pk, sk, data });
            const response = await api.put(
                API_CONFIG.ENDPOINTS.ALLOCATION.UPDATE(pk, sk),
                {
                    ...data,
                    month: formatDateToMMYYYY(data.month)
                }
            );
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Update Error:', error);
            throw error;
        }
    },

    delete: async (pk, sk) => {
        try {
            console.log('[AllocationAPI] Deleting allocation:', { pk, sk });
            const response = await api.delete(
                API_CONFIG.ENDPOINTS.ALLOCATION.DELETE(pk, sk)
            );
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Delete Error:', error);
            throw error;
        }
    }
};

export default allocationApi;