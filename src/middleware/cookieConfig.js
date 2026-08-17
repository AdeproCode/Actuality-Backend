// Cookie configuration
const cookieOptions = {
    httpOnly: true,
    secure: true, // ✅ Always true for production
    sameSite: 'none', // ✅ Required for cross-site cookies (different domains)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
};

// ✅ For development
const developmentCookieOptions = {
    httpOnly: true,
    secure: false, // ✅ Must be false for localhost
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
};

const getCookieOptions = () => {
    return process.env.NODE_ENV === 'production' 
        ? cookieOptions 
        : developmentCookieOptions;
};

module.exports = {
    cookieOptions,
    developmentCookieOptions,
    getCookieOptions,
};