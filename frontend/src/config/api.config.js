export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3333/api';

export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  TABLES: {
    PRODUCTION_SITE: 'ProductionSite',
    PRODUCTION_UNIT: 'ProductionUnit',
    PRODUCTION_CHARGE: 'ProductionCharge'
  },
  ENDPOINTS: {
    PRODUCTION: {
      SITE: {
        BASE: '/production-site',
        GET_ALL: '/production-site/all',
        GET_ONE: (companyId, productionSiteId) => 
          `/production-site/${companyId}/${productionSiteId}`,
        CREATE: '/production-site',
        UPDATE: (companyId, productionSiteId) => 
          `/production-site/${companyId}/${productionSiteId}`,
        DELETE: (companyId, productionSiteId) => 
          `/production-site/${companyId}/${productionSiteId}`
      },
      UNIT: {
        BASE: '/production-unit',
        GET_ALL: (companyId, productionSiteId) => 
          `/production-unit/${companyId}/${productionSiteId}/all`,
        GET_ONE: (companyId, productionSiteId, sk) => 
          `/production-unit/${companyId}/${productionSiteId}/${sk}`,
        CREATE: (companyId, productionSiteId) => 
          `/production-unit/${companyId}/${productionSiteId}`,
        UPDATE: (companyId, productionSiteId, sk) => 
          `/production-unit/${companyId}/${productionSiteId}/${sk}`,
        DELETE: (companyId, productionSiteId, sk) => 
          `/production-unit/${companyId}/${productionSiteId}/${sk}`
      },
      CHARGE: {
        BASE: '/production-charge',
        GET_ALL: (companyId, productionSiteId) => 
          `/production-charge/${companyId}/${productionSiteId}/all`, 
        GET_ONE: (companyId, productionSiteId, sk) => 
          `/production-charge/${companyId}/${productionSiteId}/${sk}`,
        CREATE: (companyId, productionSiteId) => 
          `/production-charge/${companyId}/${productionSiteId}`,
        UPDATE: (companyId, productionSiteId, sk) => 
          `/production-charge/${companyId}/${productionSiteId}/${sk}`,
        DELETE: (companyId, productionSiteId, sk) => 
          `/production-charge/${companyId}/${productionSiteId}/${sk}`
      }
    }
  }
};

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};