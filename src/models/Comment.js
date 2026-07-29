const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Please provide comment content'],
        trim: true,
        maxlength: [1000, 'Comment cannot be more than 1000 characters']
    },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
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
    isFlagged: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    repliesCount: {
        type: Number,
        default: 0
    },
    meta: {
        ipAddress: String,
        userAgent: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for replies
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentComment'
});

commentSchema.methods.updateVoteScore = function() {
    this.voteScore = this.upvotes - this.downvotes;
    return this;
};

module.exports = mongoose.model('Comment', commentSchema);