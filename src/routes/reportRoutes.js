const express = require('express');
const router = express.Router();
const {
    createReport,
    getReports,
    getReport,
    updateStatus,
    voteReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');
const { limiter } = require('../middleware/rateLimiter');
const { csrfProtection } = require('../middleware/csrf');

// Public routes
router.get('/', getReports);
router.get('/:id', getReport);

// Protected routes (with CSRF protection for state-changing operations)
router.post(
    '/',
    protect,
    csrfProtection,
    limiter,
    uploadMultiple,
    handleUploadError,
    createReport
);

router.put('/:id/status', protect, csrfProtection, authorize('admin', 'moderator'), updateStatus);
router.put('/:id/vote', protect, csrfProtection, voteReport);

module.exports = router;