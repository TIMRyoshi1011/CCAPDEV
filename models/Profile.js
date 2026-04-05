import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const profileSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    username: { 
        type: String, 
        required: true,
        unique: true 
    },
    avatar: { 
        type: String 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    badge: { 
        type: String, 
        default: '🥉 Bronze'
    },
    membership: { 
        type: String, 
        default: 'Bronze'
    },
    memberSince: { 
        type: String, 
        default: () => new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        })
    },
    tier: { 
        type: String, 
        default: 'Bronze'
    },
    tierIcon: { 
        type: String, 
        default: '🥉'
    },
    points: { 
        type: Number, 
        default: 0 
    },
    nextTier: { 
        type: String, 
        default: 'N/A'
    },
    verified: { 
        type: Boolean, 
        default: false 
    },
    bio: { 
        type: String, 
        default: '' 
    },
    rankClass: { 
        type: String, 
        default: 'bronze'
    },
    totalReviews: { 
        type: Number, 
        default: 0 
    },
    topCuisine: { 
        type: String, 
        default: 'None'
    },
    avgRating: { 
        type: Number, 
        default: 0 
    },
    locations: { 
        type: Number, 
        default: 0 
    },
    topRated: { 
        type: String, 
        default: 'None'
    },
    comments: { 
        type: Number, 
        default: 0 
    },
    upvotes: { 
        type: Number, 
        default: 0 
    },
    downvotes: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

profileSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

profileSchema.methods.comparePassword = async function(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

profileSchema.statics.hashPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;