const authLogger = (req, res, next) => {
  if (req.path.startsWith('/api/auth')) {
    console.log('[AUTH-MIDDLEWARE] Request:', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Not Present'
      }
    });
  }
  next();
};

module.exports = authLogger;