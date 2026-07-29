const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
    register, 
    login, 
    logout, 
    getMe,
    checkAuth 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');
const { csrfProtection, getCsrfToken } = require('../middleware/csrf');

// Validation rules
const registerValidation = [
    body('name').notEmpty().withMessage('Name is required').trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.get('/csrf-token', csrfProtection, getCsrfToken);
router.post('/register', strictLimiter, registerValidation, register);
router.post('/login', strictLimiter, loginValidation, login);
router.get('/check', checkAuth);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;