// Cookie configuration
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.actuality.ng' : undefined
};

// ⚠️ IMPORTANT: For local development, use these settings
const developmentCookieOptions = {
    httpOnly: true,
    secure: false, // ⚠️ Must be false for localhost
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
};

// Use appropriate config based on environment
const getCookieOptions = () => {
    if (process.env.NODE_ENV === 'production') {
        return cookieOptions;
    }
    return developmentCookieOptions;
};

module.exports = {
    cookieOptions,
    developmentCookieOptions,
    getCookieOptions,
};