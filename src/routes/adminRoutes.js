const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin', 'moderator'), async (req, res) => {
    try {
        const [totalReports, pendingReports, inProgressReports, resolvedReports, totalUsers] =
            await Promise.all([
                Report.countDocuments(),
                Report.countDocuments({ status: 'Pending Review' }),
                Report.countDocuments({ status: 'In Progress' }),
                Report.countDocuments({ status: 'Resolved' }),
                User.countDocuments({ role: 'citizen' })
            ]);

        // Get reports by category
        const categoryStats = await Report.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get recent reports
        const recentReports = await Report.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalReports,
                    pendingReports,
                    inProgressReports,
                    resolvedReports,
                    totalUsers,
                    resolutionRate: totalReports > 0 ? 
                        Math.round((resolvedReports / totalReports) * 100) : 0
                },
                categoryStats,
                recentReports
            }
        });

    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admin stats'
        });
    }
});

// @desc    Get all reports for admin
// @route   GET /api/admin/reports
// @access  Private/Admin
router.get('/reports', protect, authorize('admin', 'moderator'), async (req, res) => {
    try {
        const { status, category, search, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reports = await Report.find(filter)
            .populate('user', 'name email phone')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Report.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                reports,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Admin Reports Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reports'
        });
    }
});

// @desc    Delete report (admin only)
// @route   DELETE /api/admin/reports/:id
// @access  Private/Admin
router.delete('/reports/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        await report.remove();

        res.status(200).json({
            success: true,
            message: 'Report deleted successfully'
        });

    } catch (error) {
        console.error('Delete Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting report'
        });
    }
});

module.exports = router;