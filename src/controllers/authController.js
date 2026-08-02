const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { getCookieOptions } = require('../middleware/cookieConfig');

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.COOKIE_SECRET,
        { expiresIn: process.env.SESSION_EXPIRE || '7d' }
    );
};

// Set cookie helper with proper options
const setAuthCookie = (res, token) => {
    const options = getCookieOptions();
    res.cookie('token', token, options);
};

// Clear cookie helper
const clearAuthCookie = (res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone
        });

        // Generate token
        const token = generateToken(user);

        // Set cookie
        setAuthCookie(res, token);

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user exists with password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Set cookie
        setAuthCookie(res, token);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        clearAuthCookie(res);
        
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate({
                path: 'reports',
                options: { sort: { createdAt: -1 }, limit: 10 }
            });

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Check if user is authenticated
// @route   GET /api/auth/check
// @access  Public
exports.checkAuth = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(200).json({
                success: true,
                isAuthenticated: false
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.COOKIE_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                // ✅ Clear invalid cookie
                clearAuthCookie(res);
                return res.status(200).json({
                    success: true,
                    isAuthenticated: false
                });
            }

            // ✅ Refresh token to extend session
            const newToken = generateToken(user);
            setAuthCookie(res, newToken);

            res.status(200).json({
                success: true,
                isAuthenticated: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (tokenError) {
            // ✅ Token expired or invalid - clear it
            if (tokenError.name === 'TokenExpiredError' || tokenError.name === 'JsonWebTokenError') {
                clearAuthCookie(res);
            }
            return res.status(200).json({
                success: true,
                isAuthenticated: false
            });
        }

    } catch (error) {
        console.error('Check Auth Error:', error);
        res.status(200).json({
            success: true,
            isAuthenticated: false
        });
    }
};