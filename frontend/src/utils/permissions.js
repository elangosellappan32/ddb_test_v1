import { ROLES, ROLE_PERMISSIONS } from '../config/rolesConfig';

export const hasPermission = (user, resource, action) => {
  if (!user?.role) return false;
  
  const userRole = user.role.toUpperCase();
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource.toLowerCase()];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action.toUpperCase());
};

export const isAdmin = (user) => {
  return user?.role?.toUpperCase() === ROLES.ADMIN;
};

export const getModulePermissions = (user, resource) => {
  if (!user?.role || typeof user.role !== 'string') {
    return [];
  }
  
  const userRole = user.role.toUpperCase();
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    return [];
  }

  return rolePermissions[resource.toLowerCase()] || [];
};

export const hasAnyPermission = (user, resource, actions) => {
  return actions.some(action => hasPermission(user, resource, action));
};

export const hasAllPermissions = (user, resource, actions) => {
  return actions.every(action => hasPermission(user, resource, action));
};

export const getHighestRole = () => ROLES.ADMIN;

export const hasRole = (user, role) => {
  return user?.role?.toUpperCase() === role.toUpperCase();
};