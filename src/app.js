const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { errorHandler } = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimiter');
const { csrfErrorHandler } = require('./middleware/csrf');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ CORS configuration for cookie-based auth
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // ✅ Required for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

app.use(cors(corsOptions));

// Cookie parser (must come before routes)
app.use(cookieParser());

// Rate limiting
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Mount routes
app.get('/api', (req, res) => {
  res.json({
    message:
      'Welcome to the Actuality API. Your number one source for credible civic reporting.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports/:reportId/comments', commentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Actuality.ng API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// CSRF error handler (before main error handler)
app.use(csrfErrorHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;