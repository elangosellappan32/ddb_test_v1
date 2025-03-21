import axios from 'axios';
import { API_CONFIG } from '../config';

const apiInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3333/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export const fetchProductionSites = async () => {
    try {
        const response = await apiInstance.get('/production-site/all');
        return response.data;
    } catch (error) {
        console.error('[API] Production sites fetch error:', error);
        throw error;
    }
};

export const calculateStats = (sites) => {
    if (!Array.isArray(sites) || sites.length === 0) {
        return {
            total: 0,
            windSites: 0,
            solarSites: 0,
            totalCapacity: 0,
            avgInjectionVoltage: 0
        };
    }

    const stats = {
        total: sites.length,
        windSites: sites.filter(site => site.type === 'Wind').length,
        solarSites: sites.filter(site => site.type === 'Solar').length,
        totalCapacity: sites.reduce((sum, site) => sum + parseFloat(site.capacity_MW || 0), 0),
        avgInjectionVoltage: sites.reduce((sum, site) => sum + parseFloat(site.injectionVoltage_KV || 0), 0) / sites.length
    };

    return stats;
};

export const fetchProductionSiteDetails = async (companyId, productionSiteId) => {
    try {
        const url = API_CONFIG.ENDPOINTS.PRODUCTION.SITE.GET_ONE(companyId, productionSiteId);
        const response = await apiInstance.get(url);
        return response.data.data;
    } catch (error) {
        console.error('[ProductionSiteAPI] Fetch details error:', error);
        throw error;
    }
};

export const createProductionSite = async (siteData) => {
    try {
        const response = await apiInstance.post('/production-site', siteData);
        return response.data;
    } catch (error) {
        console.error('[API] Create production site error:', error);
        throw error;
    }
};

export const updateProductionSite = async (siteId, siteData) => {
    try {
        const response = await apiInstance.put(`/production-site/${siteId}`, siteData);
        return response.data;
    } catch (error) {
        console.error('[API] Update production site error:', error);
        throw error;
    }
};

export const deleteProductionSite = async (siteId) => {
    try {
        await apiInstance.delete(`/production-site/${siteId}`);
        return true;
    } catch (error) {
        console.error('[API] Delete production site error:', error);
        throw error;
    }
};

const productionSiteApi = {
    fetchAll: fetchProductionSites,
    fetchDetails: fetchProductionSiteDetails,
    create: createProductionSite,
    update: updateProductionSite,
    delete: deleteProductionSite
};

export default productionSiteApi;
