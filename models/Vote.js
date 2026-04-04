import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true
    },
    type: {
        type: String,
        enum: ['upvote', 'downvote'],
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

voteSchema.index({ postId: 1, userId: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);

export default Vote;