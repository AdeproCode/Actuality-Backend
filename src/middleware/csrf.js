const csrf = require('csurf');

// CSRF protection middleware
const csrfProtection = csrf({
    cookie: {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production'
            ? 'none'
            : 'lax'
    }
});

// CSRF error handler
const csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }
    next(err);
};

// Get CSRF token endpoint
const getCsrfToken = (req, res) => {
    res.json({
        success: true,
        csrfToken: req.csrfToken()
    });
};

module.exports = {
    csrfProtection,
    csrfErrorHandler,
    getCsrfToken
};