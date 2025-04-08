const ROLE_PERMISSIONS = {
  ADMIN: {
    'production': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    'production-units': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    'production-charges': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    'consumption': ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    'consumption-units': ['CREATE', 'READ', 'UPDATE', 'DELETE']
  },
  USER: {
    'production': ['READ', 'UPDATE'],
    'production-units': ['READ', 'UPDATE'],
    'production-charges': ['READ', 'UPDATE'],
    'consumption': ['READ', 'UPDATE'],
    'consumption-units': ['READ', 'UPDATE']
  },
  VIEWER: {
    'production': ['READ'],
    'production-units': ['READ'],
    'production-charges': ['READ'],
    'consumption': ['READ'],
    'consumption-units': ['READ']
  }
};

export const hasPermission = (user, module, action) => {
  if (!user?.role) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role.toUpperCase()];
  if (!rolePermissions) return false;

  const modulePermissions = rolePermissions[module.toLowerCase()];
  if (!modulePermissions) return false;

  return modulePermissions.includes(action.toUpperCase());
};

export const isAdmin = (user) => {
  return user?.role?.toUpperCase() === 'ADMIN';
};

export const getModulePermissions = (user, module) => {
  if (!user?.role || typeof user.role !== 'string') {
    return [];
  }
  
  const rolePermissions = ROLE_PERMISSIONS[user.role.toUpperCase()];
  if (!rolePermissions) {
    return [];
  }

  return rolePermissions[module.toLowerCase()] || [];
};