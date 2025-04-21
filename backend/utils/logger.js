const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
    logRequest: (req) => {
        console.log(`[REQUEST] ${req.method} ${req.url}`);
    },
    logResponse: (req, res) => {
        console.log(`[RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    },
    logError: (error, req) => {
        console.error(`[ERROR] ${req.method} ${req.url}`, {
            message: error.message,
            stack: error.stack
        });
    }
};

module.exports = logger;