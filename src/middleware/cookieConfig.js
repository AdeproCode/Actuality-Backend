const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
};

// ✅ For development, ensure secure is false
const developmentCookieOptions = {
    httpOnly: true,
    secure: false, // ⚠️ Must be false for localhost
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