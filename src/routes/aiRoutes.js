const express = require('express');
const jwt = require('jsonwebtoken');
const { 
    getAIResponse, 
    analyzeReport, 
    suggestCategory,
    extractLocation,
    CATEGORIES 
} = require('../services/aiService');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// ✅ Helper to refresh token
const refreshToken = (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return null;
        
        const decoded = jwt.verify(token, process.env.COOKIE_SECRET);
        const newToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            process.env.COOKIE_SECRET,
            { expiresIn: process.env.SESSION_EXPIRE || '7d' }
        );
        
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });
        
        return newToken;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
};

// ============================================
// AI CHAT ENDPOINT - With refresh
// ============================================

router.post('/chat', protect, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // ✅ Refresh token on successful AI request
        refreshToken(req, res);

        const response = await getAIResponse(message, conversationHistory);

        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process AI chat request'
        });
    }
});

// ============================================
// ANALYZE REPORT ENDPOINT - With refresh
// ============================================

router.post('/analyze', protect, async (req, res) => {
    try {
        const { title, description, category } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        // ✅ Refresh token on successful AI request
        refreshToken(req, res);

        const analysis = await analyzeReport(title, description, category);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Analysis Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze report'
        });
    }
});

// ============================================
// SUGGEST CATEGORY ENDPOINT
// ============================================

router.post('/suggest-category', protect, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const suggestion = await suggestCategory(text);

        res.json({
            success: true,
            data: suggestion
        });
    } catch (error) {
        console.error('Category Suggestion Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to suggest category'
        });
    }
});

// ============================================
// EXTRACT LOCATION ENDPOINT
// ============================================

router.post('/extract-location', protect, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const location = extractLocation(text);

        res.json({
            success: true,
            data: { location }
        });
    } catch (error) {
        console.error('Location Extraction Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to extract location'
        });
    }
});

// ============================================
// GET CATEGORIES ENDPOINT
// ============================================

router.get('/categories', async (req, res) => {
    try {
        res.json({
            success: true,
            data: { categories: CATEGORIES }
        });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get categories'
        });
    }
});

// ============================================
// AI HEALTH CHECK
// ============================================

router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            provider: process.env.AI_PROVIDER || 'none',
            features: {
                chat: true,
                analysis: true,
                categorySuggestion: true,
                locationExtraction: true
            }
        }
    });
});

module.exports = router;