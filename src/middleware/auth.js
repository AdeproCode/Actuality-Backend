const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify cookie and extract user
exports.protect = async (req, res, next) => {
    try {
        // Get token from cookie
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.COOKIE_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('Auth Error:', error);
        
        // ✅ ONLY clear cookie for specific JWT errors
        // This prevents random clearing on other errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/'
            });
            
            const message = error.name === 'TokenExpiredError' 
                ? 'Token expired' 
                : 'Invalid token';
            
            return res.status(401).json({
                success: false,
                message: message
            });
        }
        
        // ✅ For other errors (like database errors), DON'T clear cookie
        // Just return unauthorized
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Authorize roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};