const express = require('express');
const { 
    getAIResponse, 
    analyzeReport, 
    suggestCategory,
    extractLocation,
    CATEGORIES 
} = require('../services/aiService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ============================================
// AI CHAT ENDPOINT
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
// ANALYZE REPORT ENDPOINT
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