const Comment = require('../models/Comment');
const Report = require('../models/Report');
const User = require('../models/User');

// @desc    Add comment to report
// @route   POST /api/reports/:reportId/comments
// @access  Private
exports.addComment = async (req, res) => {
    try {
        const { content, parentCommentId } = req.body;
        const reportId = req.params.reportId;

        // Check if report exists
        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Check if report is closed for comments
        if (report.status === 'Resolved' || report.status === 'Rejected') {
            return res.status(400).json({
                success: false,
                message: 'Comments are closed for this report'
            });
        }

        // Create comment
        const comment = await Comment.create({
            content,
            report: reportId,
            user: req.user.id,
            parentComment: parentCommentId || null,
            meta: {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        // If it's a reply, increment replies count on parent
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(parentCommentId, {
                $inc: { repliesCount: 1 }
            });
        }

        // Increment comment count on report
        await Report.findByIdAndUpdate(reportId, {
            $inc: { commentCount: 1 }
        });

        // Increment user's comment count
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { commentsCount: 1 }
        });

        // Populate user info
        await comment.populate('user', 'name email');

        res.status(201).json({
            success: true,
            data: comment
        });

    } catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding comment'
        });
    }
};

// @desc    Get comments for a report
// @route   GET /api/reports/:reportId/comments
// @access  Public
exports.getComments = async (req, res) => {
    try {
        const reportId = req.params.reportId;
        const { sort = '-createdAt', page = 1, limit = 20 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Only get top-level comments (parentComment = null)
        const comments = await Comment.find({
            report: reportId,
            parentComment: null,
            isDeleted: false
        })
            .populate('user', 'name email')
            .populate({
                path: 'replies',
                populate: {
                    path: 'user',
                    select: 'name email'
                },
                match: { isDeleted: false }
            })
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Comment.countDocuments({
            report: reportId,
            parentComment: null,
            isDeleted: false
        });

        res.status(200).json({
            success: true,
            data: {
                comments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get Comments Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comments'
        });
    }
};

// @desc    Vote on comment
// @route   PUT /api/comments/:commentId/vote
// @access  Private
exports.voteComment = async (req, res) => {
    try {
        const { type } = req.body;
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        if (type === 'upvote') {
            comment.upvotes += 1;
        } else if (type === 'downvote') {
            comment.downvotes += 1;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid vote type'
            });
        }

        comment.updateVoteScore();
        await comment.save();

        res.status(200).json({
            success: true,
            data: {
                upvotes: comment.upvotes,
                downvotes: comment.downvotes,
                score: comment.voteScore
            }
        });

    } catch (error) {
        console.error('Vote Comment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error voting on comment'
        });
    }
};

// @desc    Delete comment (user or admin)
// @route   DELETE /api/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user owns comment or is admin
        if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }

        // Soft delete
        comment.isDeleted = true;
        await comment.save();

        // Decrement comment count on report
        await Report.findByIdAndUpdate(comment.report, {
            $inc: { commentCount: -1 }
        });

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Delete Comment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment'
        });
    }
};