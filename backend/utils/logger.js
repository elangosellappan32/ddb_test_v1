const logger = {
    info: (...args) => console.log('\x1b[36m%s\x1b[0m', '[INFO]', ...args),
    error: (...args) => console.log('\x1b[31m%s\x1b[0m', '[ERROR]', ...args),
    warn: (...args) => console.log('\x1b[33m%s\x1b[0m', '[WARN]', ...args),
    debug: (...args) => console.log('\x1b[35m%s\x1b[0m', '[DEBUG]', ...args),
    logRequest: (req) => {
        console.log(`[REQUEST] ${req.method} ${req.url}`);
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('[REQUEST BODY]', req.body);
        }
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