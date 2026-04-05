import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    currentUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: true
    },
    restaurant: {
        type: String,
        required: true
    },
    cuisine: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    ratingStars: {
        type: String
    },
    ratingValue: {
        type: Number,
        required: true
    },
    ownPost: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String
    }],
    scores: {
        service: { type: Number, default: 0 },
        taste: { type: Number, default: 0 },
        ambiance: { type: Number, default: 0 }
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    comments: [
        {
            currentUser: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Profile'
            },
            text: String,
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    reports: [
        {
            reporterEmail: {
                type: String,
                default: 'anonymous'
            },
            reason: {
                type: String,
                default: 'No reason provided'
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    edited: {
        type: Boolean,
        default: false
    },
    editedDate: {
        type: Date
    },
    userVotes: {
        type: Map,
        of: String
    }

}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

export default Post;