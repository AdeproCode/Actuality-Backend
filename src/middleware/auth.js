const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify cookie and extract user
exports.protect = async (req, res, next) => {
    try {
        // ✅ Get token from cookie (works for both dev and prod)
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
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            // ✅ Clear cookie for invalid/expired token
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/'
            });
        }
        
        return res.status(401).json({
            success: false,
            message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
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