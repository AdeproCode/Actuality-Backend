const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    addComment,
    getComments,
    voteComment,
    deleteComment
} = require('../controllers/commentController');
const { protect, authorize } = require('../middleware/auth');
const { limiter } = require('../middleware/rateLimiter');
const { csrfProtection } = require('../middleware/csrf');

// Routes
router.get('/', getComments);
router.post('/', protect, csrfProtection, limiter, addComment);
router.put('/:commentId/vote', protect, csrfProtection, voteComment);
router.delete('/:commentId', protect, csrfProtection, deleteComment);

module.exports = router;