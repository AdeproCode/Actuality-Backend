// Cookie configuration
exports.cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.actuality.ng' : undefined
};

// Generate CSRF token
exports.generateCsrfToken = (req) => {
    return req.csrfToken ? req.csrfToken() : null;
};