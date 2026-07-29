const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        trim: true,
        maxlength: [2000, 'Description cannot be more than 2000 characters']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: [
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
        ]
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: [true, 'Please provide location coordinates'],
            index: '2dsphere'
        },
        address: {
            type: String,
            trim: true
        },
        city: String,
        state: String,
        lga: String
    },
    media: [{
        url: String,
        publicId: String,
        type: {
            type: String,
            enum: ['image', 'video', 'audio'],
            default: 'image'
        }
    }],
    status: {
        type: String,
        enum: ['Pending Review', 'In Progress', 'Resolved', 'Rejected', 'Escalated'],
        default: 'Pending Review'
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['Pending Review', 'In Progress', 'Resolved', 'Rejected', 'Escalated']
        },
        note: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    upvotes: {
        type: Number,
        default: 0
    },
    downvotes: {
        type: Number,
        default: 0
    },
    voteScore: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isSpam: {
        type: Boolean,
        default: false
    },
    isDuplicate: {
        type: Boolean,
        default: false
    },
    duplicateOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    department: {
        type: String,
        enum: ['Works', 'Environment', 'Security', 'Health', 'Education', 'Other']
    },
    urgency: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    adminNotes: {
        type: String,
        trim: true
    },
    resolution: {
        note: String,
        resolvedAt: Date,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    tags: [String],
    meta: {
        userAgent: String,
        ipAddress: String,
        reportedAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add geospatial index
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ upvotes: -1 });

// Virtual for comments
reportSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'report'
});

// Methods
reportSchema.methods.addStatusHistory = function(status, note, userId) {
    this.statusHistory.push({
        status,
        note,
        updatedBy: userId,
        updatedAt: new Date()
    });
    this.status = status;
    return this;
};

reportSchema.methods.updateVoteScore = function() {
    this.voteScore = this.upvotes - this.downvotes;
    return this;
};

module.exports = mongoose.model('Report', reportSchema);