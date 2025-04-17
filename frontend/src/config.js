export const API_BASE_URL = 'http://localhost:3333';

export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  TABLES: {
    PRODUCTION_UNIT: 'ProductionUnit',
    PRODUCTION_CHARGE: 'ProductionCharge',
    PRODUCTION_SITE: 'ProductionSite'
  },
  ENDPOINTS: {
    PRODUCTION: {
      SITE: {
        BASE: '/api/production-site',
        GET_ALL: '/api/production-site/all',
        GET_ONE: (companyId, productionSiteId) => 
          `/api/production-site/${companyId}/${productionSiteId}`,
        CREATE: '/api/production-site',
        UPDATE: (companyId, productionSiteId) => 
          `/api/production-site/${companyId}/${productionSiteId}`,
        DELETE: (companyId, productionSiteId) => 
          `/api/production-site/${companyId}/${productionSiteId}`
      },
      UNIT: {
        BASE: '/api/production-unit',
        GET_ALL: '/api/production-unit/all',
        GET_ONE: (companyId, productionSiteId) => 
          `/api/production-unit/${companyId}/${productionSiteId}`,
        CREATE: '/api/production-unit',
        UPDATE: (companyId, productionSiteId) => 
          `/api/production-unit/${companyId}/${productionSiteId}`,
        DELETE: (companyId, productionSiteId) => 
          `/api/production-unit/${companyId}/${productionSiteId}`
      },
      CHARGE: {
        BASE: '/api/production-charge',
        GET_ALL: '/api/production-charge/all',
        GET_BY_SITE: (companyId, productionSiteId) => 
          `/api/production-charge/${companyId}/${productionSiteId}`,
        CREATE: '/api/production-charge',
        UPDATE: (companyId, productionSiteId) => 
          `/api/production-charge/${companyId}/${productionSiteId}`,
        DELETE: (companyId, productionSiteId) => 
          `/api/production-charge/${companyId}/${productionSiteId}`
      }
    }
  }
};

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
