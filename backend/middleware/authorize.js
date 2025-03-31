const authorize = (requiredPermissions) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.toUpperCase();
    
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    const hasRequiredPermissions = requiredPermissions.every(permission => 
      ROLE_PERMISSIONS[userRole][req.baseUrl.slice(1)]?.includes(permission)
    );

    if (!hasRequiredPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};