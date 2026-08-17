const rateLimit = require('express-rate-limit');

// General rate limiter
exports.limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // ✅ Explicitly tell the limiter to use the X-Forwarded-For header
    keyGenerator: (req) => {
        // Use the X-Forwarded-For header if it exists (proxy), otherwise use the connection IP
        return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    },
});

// Strict rate limiter for sensitive endpoints
exports.strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
        success: false,
        message: 'Too many attempts, please try again later.'
    }
});