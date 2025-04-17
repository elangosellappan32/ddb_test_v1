import api from './apiUtils';
import { API_CONFIG } from '../config/api.config';

const formatDate = (dateString) => {
    try {
        if (!dateString) {
            const date = new Date();
            return `${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
        }
        
        // If month name format (e.g., "January 2025")
        if (dateString.includes(' ')) {
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const [monthName, year] = dateString.split(' ');
            const monthNum = months.indexOf(monthName) + 1;
            if (monthNum === 0) {
                throw new Error('Invalid month name');
            }
            return `${monthNum.toString().padStart(2, '0')}${year}`;
        }
        
        // Handle YYYY-MM format
        if (dateString.includes('-')) {
            const [year, month] = dateString.split('-');
            if (!year || !month || year.length !== 4) {
                throw new Error('Invalid YYYY-MM format');
            }
            return `${month.padStart(2, '0')}${year}`;
        }
        
        // If already in MMYYYY format, validate and return
        if (dateString.length === 6) {
            const month = parseInt(dateString.substring(0, 2));
            if (month >= 1 && month <= 12) {
                return dateString;
            }
            throw new Error('Invalid month in MMYYYY format');
        }
        
        throw new Error('Invalid date format. Expected: YYYY-MM, "Month YYYY", or MMYYYY');
    } catch (error) {
        console.error('[AllocationAPI] Date format error:', error);
        throw error;
    }
};

const validateAllocation = (data) => {
    const requiredFields = [
        'productionSiteId',
        'consumptionSiteId',
        'productionSite',
        'consumptionSite',
        'allocated',
        'type'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (Object.values(data.allocated || {}).some(val => val < 0)) {
        throw new Error('Allocation amounts cannot be negative');
    }

    return true;
};

const allocationApi = {
    fetchAll: async (month) => {
        try {
            const formattedMonth = formatDate(month);
            const response = await api.get(
                API_CONFIG.ENDPOINTS.ALLOCATION.GET_ALL(formattedMonth)
            );
            
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to fetch allocations');
            }
            
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Fetch Error:', error);
            throw error;
        }
    },

    create: async (data) => {
        try {
            validateAllocation(data);
            
            const formattedData = {
                ...data,
                month: formatDate(data.month)
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
            allocations.forEach(validateAllocation);
            
            const formattedAllocations = allocations.map(allocation => ({
                ...allocation,
                month: formatDate(allocation.month)
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
            validateAllocation(data);
            
            const response = await api.put(
                API_CONFIG.ENDPOINTS.ALLOCATION.UPDATE(pk, sk),
                {
                    ...data,
                    month: formatDate(data.month)
                }
            );
            
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to update allocation');
            }
            
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Update Error:', error);
            throw error;
        }
    },

    delete: async (pk, sk) => {
        try {
            const response = await api.delete(
                API_CONFIG.ENDPOINTS.ALLOCATION.DELETE(pk, sk)
            );
            
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to delete allocation');
            }
            
            return response.data;
        } catch (error) {
            console.error('[AllocationAPI] Delete Error:', error);
            throw error;
        }
    }
};

export default allocationApi;