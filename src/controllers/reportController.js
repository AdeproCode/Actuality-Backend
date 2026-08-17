const Report = require('../models/Report');
const User = require('../models/User');

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            location,
            isAnonymous,
            tags
        } = req.body;

        // ✅ Check if user exists on request
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if location is provided
        if (!location || !location.coordinates) {
            return res.status(400).json({
                success: false,
                message: 'Location coordinates are required'
            });
        }

        // Extract media URLs from uploaded files
        const media = req.files ? req.files.map(file => ({
            url: file.path,
            publicId: file.filename,
            type: file.mimetype.startsWith('video') ? 'video' : 'image'
        })) : [];

        // Create report
        const report = await Report.create({
            title,
            description,
            category,
            location: {
                type: 'Point',
                coordinates: location.coordinates,
                address: location.address,
                city: location.city,
                state: location.state,
                lga: location.lga
            },
            media,
            isAnonymous: isAnonymous || false,
            user: req.user.id,
            tags: tags || [],
            meta: {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            }
        });

        // Update user's report count
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { reportsCount: 1 }
        });

        res.status(201).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Create Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating report'
        });
    }
};

// @desc    Get all reports (with filters)
// @route   GET /api/reports
// @access  Public
exports.getReports = async (req, res) => {
    try {
        const {
            category,
            status,
            state,
            city,
            search,
            sort = '-createdAt',
            page = 1,
            limit = 20,
            near
        } = req.query;

        // Build filter object
        const filter = { isSpam: false };

        if (category) filter.category = category;
        if (status) filter.status = status;
        if (state) filter['location.state'] = state;
        if (city) filter['location.city'] = city;

        // Search by title or description
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Geospatial query for nearby reports
        let nearQuery = {};
        if (near) {
            const [lat, lng] = near.split(',').map(Number);
            const distance = req.query.distance || 5000; // default 5km in meters

            nearQuery = {
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        },
                        $maxDistance: distance
                    }
                }
            };
        }

        // Combine filters
        const query = { ...filter, ...nearQuery };

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const reports = await Report.find(query)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Report.countDocuments(query);

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
        console.error('Get Reports Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reports'
        });
    }
};

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Public
exports.getReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id)
            .populate('user', 'name email isVerified')
            .populate('assignedTo', 'name email')
            .populate({
                path: 'statusHistory.updatedBy',
                select: 'name email'
            })
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name email'
                }
            });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Increment view count
        await Report.findByIdAndUpdate(req.params.id, {
            $inc: { viewCount: 1 }
        });

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Get Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching report'
        });
    }
};

// @desc    Update report status (Admin only)
// @route   PUT /api/reports/:id/status
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
    try {
        const { status, note, department, urgency } = req.body;
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Add to status history
        report.addStatusHistory(status, note || '', req.user.id);

        if (department) report.department = department;
        if (urgency) report.urgency = urgency;

        // If resolved
        if (status === 'Resolved') {
            report.resolution = {
                note: note || 'Report resolved',
                resolvedAt: new Date(),
                resolvedBy: req.user.id
            };
        }

        await report.save();

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
};

// @desc    Upvote or downvote a report
// @route   PUT /api/reports/:id/vote
// @access  Private
exports.voteReport = async (req, res) => {
    try {
        const { type } = req.body; // 'upvote' or 'downvote'
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Prevent self-voting (optional)
        if (report.user.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot vote on your own report'
            });
        }

        // Track user votes to prevent double voting (would need a Vote model)
        // Simple implementation: increment/decrement
        if (type === 'upvote') {
            report.upvotes += 1;
        } else if (type === 'downvote') {
            report.downvotes += 1;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid vote type. Use "upvote" or "downvote"'
            });
        }

        report.updateVoteScore();
        await report.save();

        res.status(200).json({
            success: true,
            data: {
                upvotes: report.upvotes,
                downvotes: report.downvotes,
                score: report.voteScore
            }
        });

    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error voting on report'
        });
    }
};