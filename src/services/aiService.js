const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// ============================================
// CONSTANTS
// ============================================

const CATEGORIES = [
    'Infrastructure',
    'Pothole',
    'Drainage',
    'Road',
    'Streetlight',
    'Waste Management',
    'Water Supply',
    'Security',
    'Police Brutality',
    'Corruption',
    'Healthcare',
    'Education',
    'Environment',
    'Public Transport',
    'Housing',
    'Land Grabbing',
    'Illegal Dumping',
    'Noise Pollution',
    'Government Services',
    'Election Issues',
    'Other'
];

const URGENCY_KEYWORDS = {
    critical: ['emergency', 'urgent', 'immediate', 'danger', 'hazard', 'threat', 'collapse', 'flood', 'death'],
    high: ['severe', 'major', 'serious', 'heavy', 'widespread', 'blocking', 'overflow', 'damage'],
    medium: ['moderate', 'significant', 'ongoing', 'multiple', 'recurring'],
    low: ['minor', 'small', 'slight', 'occasional', 'mild']
};

// ============================================
// AI PROVIDER CONFIGURATION
// ============================================

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let openaiClient = null;
let geminiClient = null;

if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
} else if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ============================================
// AI FUNCTIONS
// ============================================

/**
 * Get response from AI provider
 */
const getAIResponse = async (prompt, conversationHistory = []) => {
    const systemPrompt = `You are a helpful civic reporting assistant for Actuality.ng, a Nigerian civic tech platform.
Your role is to help citizens report civic issues in their community.

You should:
1. Ask clarifying questions to understand the issue better
2. Suggest appropriate categories from this list: ${CATEGORIES.join(', ')}
3. Help draft a clear title and description
4. Identify location if mentioned
5. Determine urgency based on the description

Keep responses concise and helpful. Ask one question at a time.
Always respond in JSON format with these fields:
{
    "response": "your response text",
    "suggestedCategory": "category or null",
    "suggestedTitle": "suggested title or null",
    "extractedLocation": "location or null",
    "confidence": 0.0 to 1.0,
    "action": "continue or submit or clarify"
}`;

    try {
        if (AI_PROVIDER === 'openai' && openaiClient) {
            return await getOpenAIResponse(systemPrompt, prompt, conversationHistory);
        } else if (AI_PROVIDER === 'gemini' && geminiClient) {
            return await getGeminiResponse(systemPrompt, prompt, conversationHistory);
        } else {
            throw new Error('No AI provider configured');
        }
    } catch (error) {
        console.error('AI Error:', error);
        return getFallbackResponse();
    }
};

/**
 * OpenAI implementation
 */
const getOpenAIResponse = async (systemPrompt, prompt, conversationHistory) => {
    if (!openaiClient) throw new Error('OpenAI client not initialized');

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: prompt }
    ];

    const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
        max_tokens: parseInt(process.env.MAX_TOKENS || '500'),
        response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
};

/**
 * Google Gemini implementation
 */
const getGeminiResponse = async (systemPrompt, prompt, conversationHistory) => {
    if (!geminiClient) throw new Error('Gemini client not initialized');

    const model = geminiClient.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-pro',
    });

    const fullPrompt = `${systemPrompt}\n\nConversation history: ${JSON.stringify(conversationHistory)}\n\nUser: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    let jsonContent = text;
    if (text.includes('```json')) {
        jsonContent = text.split('```json')[1].split('```')[0];
    }

    return JSON.parse(jsonContent);
};

/**
 * Fallback response when AI fails
 */
const getFallbackResponse = () => {
    return {
        response: "I'm here to help you report this issue. Could you please tell me more about what's happening?",
        suggestedCategory: null,
        suggestedTitle: null,
        extractedLocation: null,
        confidence: 0,
        action: 'continue'
    };
};

/**
 * Analyze a report and suggest category and urgency
 */
const analyzeReport = async (title, description, category) => {
    const text = `${title}. ${description}`;
    const textLower = text.toLowerCase();

    // Determine urgency based on keywords
    let urgency = 'Low';
    for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
        if (keywords.some(keyword => textLower.includes(keyword))) {
            urgency = level.charAt(0).toUpperCase() + level.slice(1);
            break;
        }
    }

    // Extract keywords
    const words = textLower.match(/\b[a-z]{3,}\b/g) || [];
    const commonWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'are', 'was', 'were', 'has', 'had'];
    const keywords = words
        .filter(w => !commonWords.includes(w) && w.length > 3)
        .slice(0, 10);

    // Get AI category suggestion
    let suggestedCategory = category || 'Other';
    let confidence = 0.7;

    try {
        const suggestion = await suggestCategory(text);
        if (suggestion) {
            suggestedCategory = suggestion.category;
            confidence = suggestion.confidence;
        }
    } catch (error) {
        console.error('Category suggestion failed:', error);
        // Use simple keyword-based fallback
        for (const cat of CATEGORIES) {
            if (textLower.includes(cat.toLowerCase())) {
                suggestedCategory = cat;
                confidence = 0.8;
                break;
            }
        }
    }

    // Generate summary
    const summary = `${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`;

    return {
        suggestedCategory,
        confidence,
        urgency,
        keywords: keywords.slice(0, 5),
        summary
    };
};

/**
 * Suggest a category for the report
 */
const suggestCategory = async (text) => {
    const prompt = `Based on this text, suggest the most appropriate category from the list.
Text: ${text}
Categories: ${CATEGORIES.join(', ')}
Return only the category name.`;

    try {
        if (AI_PROVIDER === 'openai' && openaiClient) {
            const response = await openaiClient.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a category suggester. Return only the category name.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 50
            });
            const category = response.choices[0]?.message?.content?.trim() || 'Other';
            return { category, confidence: 0.9 };
        } else if (AI_PROVIDER === 'gemini' && geminiClient) {
            const model = geminiClient.getGenerativeModel({
                model: process.env.GEMINI_MODEL || 'gemini-pro',
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const category = response.text().trim() || 'Other';
            return { category, confidence: 0.9 };
        } else {
            // Simple keyword-based fallback
            const textLower = text.toLowerCase();
            for (const cat of CATEGORIES) {
                if (textLower.includes(cat.toLowerCase())) {
                    return { category: cat, confidence: 0.8 };
                }
            }
            return { category: 'Other', confidence: 0.3 };
        }
    } catch (error) {
        console.error('Category suggestion error:', error);
        return { category: 'Other', confidence: 0.3 };
    }
};

/**
 * Extract location from text
 */
const extractLocation = (text) => {
    // Simple location extraction based on patterns
    const patterns = [
        /in\s+([A-Za-z\s]+)(?:,|\s+)([A-Za-z\s]+)?/i,
        /at\s+([A-Za-z\s]+)(?:,|\s+)([A-Za-z\s]+)?/i,
        /near\s+([A-Za-z\s]+)/i,
        /around\s+([A-Za-z\s]+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return null;
};

module.exports = {
    getAIResponse,
    analyzeReport,
    suggestCategory,
    extractLocation,
    CATEGORIES
};