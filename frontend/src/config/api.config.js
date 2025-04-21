export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3333/api';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TABLES: {
    ROLE: 'RoleTable',
    PRODUCTION_SITE: 'ProductionSiteTable',
    PRODUCTION_UNIT: 'ProductionUnitTable',
    PRODUCTION_CHARGE: 'ProductionChargeTable',
    BANKING: 'BankingTable',
    ALLOCATION: 'AllocationTable'
  },
  ENDPOINTS: {
    AUTH: {
      BASE: '/auth',
      LOGIN: '/auth/login',
      VERIFY: '/auth/verify',
      GET_CURRENT_USER: '/auth/me',
    },
    ROLES: {
      BASE: '/roles',
      GET_ALL: '/roles/all',
      GET_BY_ID: (roleId) => `/roles/${roleId}`,
      GET_BY_USERNAME: (username) => `/roles/user/${username}`,
    },
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
        GET_ONE: (companyId, productionSiteId, unitId) => 
          `/production-unit/${companyId}/${productionSiteId}/${unitId}`,
        CREATE: (companyId, productionSiteId) => 
          `/production-unit/${companyId}/${productionSiteId}`,
        UPDATE: (companyId, productionSiteId, unitId) => 
          `/production-unit/${companyId}/${productionSiteId}/${unitId}`,
        DELETE: (companyId, productionSiteId, unitId) => 
          `/production-unit/${companyId}/${productionSiteId}/${unitId}`
      },
      CHARGE: {
        BASE: '/production-charge',
        GET_ALL: (companyId, productionSiteId) => 
          `/production-charge/${companyId}/${productionSiteId}/all`,
        GET_ONE: (companyId, productionSiteId, chargeId) => 
          `/production-charge/${companyId}/${productionSiteId}/${chargeId}`,
        CREATE: (companyId, productionSiteId) => 
          `/production-charge/${companyId}/${productionSiteId}`,
        UPDATE: (companyId, productionSiteId, chargeId) => 
          `/production-charge/${companyId}/${productionSiteId}/${chargeId}`,
        DELETE: (companyId, productionSiteId, chargeId) => 
          `/production-charge/${companyId}/${productionSiteId}/${chargeId}`
      }
    },
    CONSUMPTION: {
      SITE: {
        BASE: '/consumption-site',
        GET_ALL: '/consumption-site/all',
        GET_ONE: (companyId, siteId) => `/consumption-site/${companyId}/${siteId}`,
        CREATE: '/consumption-site',
        UPDATE: (companyId, siteId) => `/consumption-site/${companyId}/${siteId}`,
        DELETE: (companyId, siteId) => `/consumption-site/${companyId}/${siteId}`
      },
      UNIT: {
        BASE: '/consumption-unit',
        GET_ALL: (companyId, siteId) => `/consumption-unit/${companyId}/${siteId}/all`,
        GET_ONE: (companyId, siteId, sk) => `/consumption-unit/${companyId}/${siteId}/${sk}`,
        CREATE: (companyId, siteId) => `/consumption-unit/${companyId}/${siteId}`,
        UPDATE: (companyId, siteId, sk) => `/consumption-unit/${companyId}/${siteId}/${sk}`,
        DELETE: (companyId, siteId, sk) => `/consumption-unit/${companyId}/${siteId}/${sk}`
      }
    },
    BANKING: {
      BASE: '/banking',
      GET_ALL: '/banking',
      GET_ONE: (pk, sk) => `/banking/${pk}/${sk}`,
      CREATE: '/banking',
      UPDATE: (pk, sk) => `/banking/${pk}/${sk}`,
      DELETE: (pk, sk) => `/banking/${pk}/${sk}`,
      GET_BY_PERIOD: (pk, period) => `/banking/${pk}/period/${period}`
    },
    ALLOCATION: {
      BASE: '/allocation',
      GET_ALL: (month) => `/allocation/month/${month}`,
      GET_BY_PERIOD: (period, month) => `/allocation/period/${period}/month/${month}`,
      CREATE: '/allocation',
      CREATE_BATCH: '/allocation/batch',
      UPDATE: (pk, sk) => `/allocation/${pk}/${sk}`,
      DELETE: (pk, sk) => `/allocation/${pk}/${sk}`,
      CREATE_LAPSE: '/allocation/lapse'
    },
    LAPSE: {
      BASE: '/api/lapse',
      GET_ALL: '/api/lapse',
      GET_ONE: (pk, sk) => `/api/lapse/${pk}/${sk}`,
      CREATE: '/api/lapse',
      UPDATE: (pk, sk) => `/api/lapse/${pk}/${sk}`,
      DELETE: (pk, sk) => `/api/lapse/${pk}/${sk}`
    }
  }
};

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const API_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGIN_FAILED: 'Invalid username or password',
    LOGOUT_SUCCESS: 'Logged out successfully',
    SESSION_EXPIRED: 'Your session has expired. Please login again',
    UNAUTHORIZED: 'You are not authorized to perform this action'
  },
  PRODUCTION: {
    SITE_CREATED: 'Production site created successfully',
    SITE_UPDATED: 'Production site updated successfully',
    SITE_DELETED: 'Production site deleted successfully',
    UNIT_CREATED: 'Production unit created successfully',
    UNIT_UPDATED: 'Production unit updated successfully',
    UNIT_DELETED: 'Production unit deleted successfully',
    CHARGE_CREATED: 'Production charge created successfully',
    CHARGE_UPDATED: 'Production charge updated successfully',
    CHARGE_DELETED: 'Production charge deleted successfully'
  }
};

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    canCreateUser: true,
    canUpdateRole: true,
    canDeleteUser: true,
    canViewAllUsers: true,
    canUpdatePassword: true,
    canAccessProduction: true,
    roleId: 'ROLE-1'
  },
  [ROLES.USER]: {
    canCreateUser: false,
    canUpdateRole: false,
    canDeleteUser: false,
    canViewAllUsers: false,
    canUpdatePassword: true,
    canAccessProduction: true,
    roleId: 'ROLE-2'
  },
  [ROLES.VIEWER]: {
    canCreateUser: false,
    canUpdateRole: false,
    canDeleteUser: false,
    canViewAllUsers: false,
    canUpdatePassword: true,
    canAccessProduction: false,
    roleId: 'ROLE-3'
  }
};