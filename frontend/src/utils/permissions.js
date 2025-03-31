const ROLE_PERMISSIONS = {
  ADMIN: {
    production: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    units: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    charges: ['CREATE', 'READ', 'UPDATE', 'DELETE']
  },
  USER: {
    production: ['READ', 'UPDATE'],
    units: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    charges: ['CREATE', 'READ', 'UPDATE', 'DELETE'] 
  },
  VIEWER: {
    production: ['READ'],
    units: ['READ'],
    charges: ['READ']
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

export const getModulePermissions = (user, module) => {
  if (!user?.role || typeof user.role !== 'string') {
    return [];
  }
  
  const rolePermissions = ROLE_PERMISSIONS[user.role.toUpperCase()];
  if (!rolePermissions) {
    return [];
  }

  return rolePermissions[module] || [];
};