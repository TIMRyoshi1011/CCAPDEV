import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import connectToMongoose from "./db/conn.js";
import Profile from './models/Profile.js';
import Post from './models/Post.js';
import Vote from './models/Vote.js';
import 'dotenv/config';

const app = express();
const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

let cuisines = ["Filipino", "Chinese", "Japanese", "Korean", "Thai", "Vietnamese", "Italian", "American", "Indian", "Mexican"];
let locations = ["BGC", "Makati", "Quezon City", "Taguig"];
let sortOptions = ["Recent", "Top Rated", "Most Commented"];

// Points system constants
const POINTS = {
    WRITE_REVIEW: 10,
    RECEIVE_UPVOTE: 2,
    RECEIVE_DOWNVOTE: -1,
    ADD_COMMENT: 2,
    RECEIVE_COMMENT: 2
};

const TIER_THRESHOLDS = {
    BRONZE: 0,
    SILVER: 50,
    GOLD: 150,
    PLATINUM: 300,
    DIAMOND: 500,
    MASTER: 1000
};

// Helper function to update user points and tier
async function updateUserReputation(userEmail, pointsDelta) {
    try {
        const user = await Profile.findOne({ email: userEmail }).lean();
        if (!user) return;
        
        // Prevent negative points
        let newPoints = (user.points || 0) + pointsDelta;
        if (newPoints < 0) newPoints = 0; 
        
        let newTier = "Bronze";
        let newBadge = "🥉 Bronze";
        let isVerified = false;
        let rankClass = "bronze";
        let nextTier = "Silver";
        
        if (newPoints >= TIER_THRESHOLDS.MASTER) {
            newTier = "Master";
            newBadge = "🏆 Master";
            isVerified = true;
            rankClass = "master";
            nextTier = "Max Tier";
        } else if (newPoints >= TIER_THRESHOLDS.DIAMOND) {
            newTier = "Diamond";
            newBadge = "💍 Diamond";
            isVerified = true;
            rankClass = "diamond";
            nextTier = "Master";
        } else if (newPoints >= TIER_THRESHOLDS.PLATINUM) {
            newTier = "Platinum";
            newBadge = "💎 Platinum";
            isVerified = true;
            rankClass = "platinum";
            nextTier = "Diamond";
        } else if (newPoints >= TIER_THRESHOLDS.GOLD) {
            newTier = "Gold";
            newBadge = "🥇 Gold";
            isVerified = true;
            rankClass = "gold";
            nextTier = "Platinum";
        } else if (newPoints >= TIER_THRESHOLDS.SILVER) {
            newTier = "Silver";
            newBadge = "🥈 Silver";
            isVerified = true;
            rankClass = "silver";
            nextTier = "Gold";
        }
        
        await Profile.updateOne(
            { email: userEmail },
            { 
                $set: { 
                    points: newPoints,
                    tier: newTier,
                    badge: newBadge,
                    verified: isVerified,
                    rankClass: rankClass,
                    nextTier: nextTier
                }
            }
        );
        
        // Update session user if relevant
        if (currentUser && currentUser.email === userEmail) {
            currentUser.points = newPoints;
            currentUser.tier = newTier;
            currentUser.badge = newBadge;
            currentUser.verified = isVerified;
            currentUser.rankClass = rankClass;
            currentUser.nextTier = nextTier;
        }
    } catch (err) {
        console.error("Error updating reputation:", err);
    }
}

// current active user
let currentUser = {};

// Helper to refresh current user data from DB
async function refreshCurrentUser() {
    if (currentUser && currentUser.email) {
        try {
            const freshUser = await Profile.findOne({ email: currentUser.email }).lean();
            if (freshUser) {
                // Merge fresh data into currentUser, preserving session-specific fields if any
                Object.assign(currentUser, freshUser);
            }
        } catch (err) {
            console.error("Error refreshing user data:", err);
        }
    }
}

// current posts
let posts = [];

// handlebar helper functions
app.engine("hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
        formatDate: (date) => {
            // Handles date inputs, ensures it is a number and not a string
            if (!date) return '';
            const d = new Date(date);
            return isNaN(d.getTime()) ? date : d.toLocaleDateString();
        },
        eq: (a, b) => a == b,
        toString: (obj) => obj ? obj.toString() : '',
        userVoteClass: (post, voteType) => {
            // Handles upvotes and downvotes of reviews
            if (typeof voteType !== 'string') {
                voteType = 'upvote';
            }
            if (post.userVote === voteType) {
                return 'voted';
            }
            return '';
        },
        renderStars: (rating) => {
            // Handles star rating values
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                if (rating >= i) {
                    stars += '<span class="star full">★</span>';
                } else if (rating >= i - 0.5) {
                    stars += '<span class="star half">★</span>';
                } else {
                    stars += '<span class="star empty">★</span>';
                }
            }
            return stars;
        },
        timeAgo: (date) => {
            // Handles timestamp computations
        const pastDate = new Date(date);
        const now = new Date();
        const seconds = Math.floor((now - pastDate) / 1000);

        if (seconds < 60) return `${seconds} seconds ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} days ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} weeks ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} months ago`;
        const years = Math.floor(days / 365);
        return `${years} years ago`;
        }
    },
    layoutsDir: path.join(__dirname, "views/layouts")
}));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static('public')); 

app.get('/', async (req, res) => {
    try {
        const allPosts = await Post.find({})
            .populate('currentUser', 'avatar name username tier badge rankClass verified')
            .lean();

        // Gets total number of posts (reviews)
        const totalReviews = allPosts.length;
        // Use Set to count unique restaurants (case-insensitive)
        const restaurants = new Set(allPosts.map(p => p.restaurant ? p.restaurant.trim().toLowerCase() : "")).size;
        // Use Set to count unique locations
        const locations = new Set(allPosts.map(p => p.location ? p.location.trim() : "")).size;
        
        let totalRating = 0;
        allPosts.forEach(p => {
            totalRating += parseFloat(p.ratingValue || 0);
        });
        const avgRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "0.0";

        // Add ownership and vote info
        for (let post of allPosts) {
            // Check ownership
            if (currentUser.email && post.currentUser && post.currentUser.email === currentUser.email) {
                post.ownPost = true;
            } else {
                post.ownPost = false;
            }

            // Get user vote
            if (currentUser._id) {
                const userVote = await Vote.findOne({
                    userId: currentUser._id,
                    postId: post._id
                }).lean();
                post.userVote = userVote ? userVote.type : null;
            } else {
                post.userVote = null;
            }
        }

        // Top Reviews 
        // Clone array before sorting to avoid modifying original list if needed later
        const topReviews = [...allPosts].sort((a, b) => parseFloat(b.ratingValue) - parseFloat(a.ratingValue)).slice(0, 3);

        res.render('landing', {
            layout: false,
            stats: {
                reviews: totalReviews,
                restaurants: restaurants,
                locations: locations,
                avgRating: avgRating
            },
            topReviews: topReviews,
            currentUser 
        });
    } catch(err) {
        console.error("Error loading landing page:", err);
        res.status(500).send("Error loading landing page");
    }
});


app.get('/community-reviews', async (req, res) => {
    try {
        await refreshCurrentUser(); 

        const allPosts = await Post.find({}).sort({ _id: -1 })
            .populate('currentUser', 'avatar name username tier badge rankClass verified')
            .lean();
        
        // Add ownership and vote info
        for (let post of allPosts) {
            // Check ownership
            if (currentUser.email && post.currentUser && post.currentUser.email === currentUser.email) {
                post.ownPost = true;
            } else {
                post.ownPost = false;
            }

            // Get user vote
            if (currentUser._id) {
                const userVote = await Vote.findOne({
                    userId: currentUser._id,
                    postId: post._id
                }).lean();
                post.userVote = userVote ? userVote.type : null;
            } else {
                post.userVote = null;
            }
        }

        res.render('community-reviews', {
            layout: false,
            posts: allPosts,
            currentUser
        });
    } catch(err) {
        console.error("Error loading community reviews:", err);
        res.status(500).send("Error loading community reviews");
    }
});

// Logout route
app.get("/logout", (req, res) => {
    currentUser = {}; 
    res.redirect("/");
});

// Delete User Account
app.delete("/delete-user", async (req, res) => {
    try {
        if (!currentUser || !currentUser.username) {
            return res.status(401).json({ message: "Not logged in" });
        }
        
        await Profile.deleteOne({ username: currentUser.username }); 
        
        currentUser = {}; // Clear session
        
        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Error deleting account:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// API Route to fetch user profile data for modal
app.get("/api/user/:username", async (req, res) => {
    try {
        const username = req.params.username;

        // Find user
        const user = await Profile.findOne({ username: username }).lean();
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Find all posts by this user to calculate stats
        const userPosts = await Post.find({ "currentUser": user._id })
            .populate('currentUser', 'avatar name username tier badge rankClass verified')
            .lean();

        // Calculate stats
        let totalReviews = userPosts.length;
        let locationsSet = new Set();
        let cuisineCounts = {};
        let locationCounts = {};
        
        let totalService = 0;
        let totalTaste = 0;
        let totalAmbiance = 0;

        userPosts.forEach(post => {
            if (post.location) {
                locationsSet.add(post.location);
                locationCounts[post.location] = (locationCounts[post.location] || 0) + 1;
            }
            if (post.cuisine) {
                cuisineCounts[post.cuisine] = (cuisineCounts[post.cuisine] || 0) + 1;
            }
            if (post.scores) {
                totalService += (post.scores.service || 0);
                totalTaste += (post.scores.taste || 0);
                totalAmbiance += (post.scores.ambiance || 0);
            }
        });

        // Top Location
        let topLocation = "None";
        if (Object.keys(locationCounts).length > 0) {
            topLocation = Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b);
        }

        // Top Cuisine (if not already in user object or verifying it)
        let topCuisine = user.topCuisine || "None";
        if (Object.keys(cuisineCounts).length > 0) {
             // prioritizing calculated one if we want dynamic
            topCuisine = Object.keys(cuisineCounts).reduce((a, b) => cuisineCounts[a] > cuisineCounts[b] ? a : b);
        }

        const avgService = totalReviews > 0 ? (totalService / totalReviews).toFixed(1) : "0.0";
        const avgTaste = totalReviews > 0 ? (totalTaste / totalReviews).toFixed(1) : "0.0";
        const avgAmbiance = totalReviews > 0 ? (totalAmbiance / totalReviews).toFixed(1) : "0.0";

        const responseData = {
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            badge: user.badge || "Newbie", // Default if missing
            verified: user.verified || false,
            bio: user.bio || "No bio yet.",
            joinDate: user.memberSince || "Unknown",
            totalReviews: totalReviews,
            points: user.points || 0,
            tier: user.tier || "Bronze",
            topCuisine: topCuisine,
            topLocation: topLocation,
            ratings: {
                service: avgService,
                taste: avgTaste,
                ambiance: avgAmbiance
            }
        };

        res.json(responseData);

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

connectToMongoose()
// for MongoDB Connection
// connectToMongo((err) => {
//     if(err) {
//         console.log("error occurred");
//         console.error(err);
//         process.exit();
//     }
//     console.log("Connected to MongoDB server");
// });

// Sign Up
app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // check if user already exists
        const existingUser = await Profile.findOne({ email }).lean();
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = {
            name: name,   
            username: name.toLowerCase().replace(/\s+/g, '_'),
            avatar: name.split(' ').map(word => word[0].toUpperCase()).join(''),
            email: email,
            password: password,         
            badge: "🥉 Bronze", 
            membership: "Bronze",
            memberSince: new Date().toLocaleDateString('en-US', {
                month: 'long', 
                day: 'numeric', 
                year: 'numeric'  
            }),
            tier: "Bronze",
            tierIcon: "🥉",
            points: 0,
            nextTier: "N/A",
            verified: false,
            bio: "Bio",
            rankClass: "bronze",
            totalReviews: 0,  
            topCuisine: 'None',   
            avgRating: 0,    
            locations: 0,    
            topRated: 'None',    
            comments: 0,
            upvotes: 0,
            downvotes: 0
        };

        currentUser = newUser;

        const result = await Profile.create(newUser); 
        console.log("User created:", result._id);

        res.json({ message: "Signup successful" });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const acc = await Profile.findOne({ email: email });

        if (!acc) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isPasswordMatch = await acc.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        currentUser = acc.toObject();

        res.json({ message: "Login successful" });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Forgot Password
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await Profile.findOne({ email: email }).lean();

        if (!user) {
            return res.json({
                success: false,
                message: "Email not found."
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// Change Password
app.post("/change-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        console.log(`[Change Password] Request for ${email}`);

        const hashedPassword = await Profile.hashPassword(newPassword);

        const result = await Profile.updateOne(
            { email: email },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            return res.json({ message: "User not found." });
        }
        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});

// Update Password for signed in user
app.post("/update-password", async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentUser) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const user = await Profile.findOne({ email: currentUser.email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isPasswordMatch = await user.comparePassword(currentPassword);
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const hashedPassword = await Profile.hashPassword(newPassword);

        const result = await Profile.updateOne(
            { email: currentUser.email },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        await refreshCurrentUser();

        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});

// After login, redirect to feed
app.get("/feed", async (req, res) => { 
    try {
        await refreshCurrentUser(); 

        const { cuisine, location, sort, search } = req.query;
        const searchTerm = (search || "").trim();
        let query = {};

        if (cuisine && cuisine !== '') {
            query.cuisine = cuisine;
        }

        if (location && location !== '') {
            query.location = location;
        }

        if (searchTerm) {
            query.$or = [
                { title: { $regex: searchTerm, $options: "i" } },
                { content: { $regex: searchTerm, $options: "i" } },
                { restaurant: { $regex: searchTerm, $options: "i" } },
                { cuisine: { $regex: searchTerm, $options: "i" } },
                { location: { $regex: searchTerm, $options: "i" } },
                { "currentUser.name": { $regex: searchTerm, $options: "i" } },
                { "currentUser.username": { $regex: searchTerm, $options: "i" } }
            ];
        }

        let cursor = Post.find(query)
            .sort({ _id: -1 })
            .populate('currentUser', 'avatar name username tier badge rankClass verified')
            .populate('comments.currentUser', 'avatar name username tier badge rankClass verified');
        posts = await cursor.lean();

        if (sort === 'Top Rated') {
            posts.sort((a, b) => {
                const ratingA = parseFloat(a.ratingValue || 0);
                const ratingB = parseFloat(b.ratingValue || 0);

                if (ratingB !== ratingA) {
                    return ratingB - ratingA;
                }

                // For equal ratings, keep newer posts first.
                return new Date(b.date || 0) - new Date(a.date || 0);
            });
        }

        // Refresh post author badges/tiers for display
        if (posts.length > 0) {  
            // Collect all unique usernames
            const usernames = new Set();
            posts.forEach(p => {
                if (p.currentUser && p.currentUser.username) usernames.add(p.currentUser.username);
                if (p.comments) {
                    p.comments.forEach(c => {
                        if (c.currentUser && c.currentUser.username) usernames.add(c.currentUser.username);
                    });
                }
            });

            if (usernames.size > 0) {
                const freshUsers = await Profile.find({ username: { $in: [...usernames] } }).lean();
                    // .populate('currentUser', 'avatar name username tier badge rankClass verified')
                const userMap = {};
                freshUsers.forEach(u => userMap[u.username] = u);

                // Update posts in memory
                posts.forEach(p => {
                    // Update Post Author
                    if (p.currentUser && p.currentUser.username) {
                        const fresh = userMap[p.currentUser.username];
                        if (fresh) {
                            p.currentUser.tier = fresh.tier;
                            p.currentUser.badge = fresh.badge;
                            p.currentUser.rankClass = fresh.rankClass;
                            p.currentUser.verified = fresh.verified;
                            p.currentUser.avatar = fresh.avatar; 
                        }
                    }
                    
                    // Update Comment Authors
                    if (p.comments) {
                        p.comments.forEach(c => {
                            if (c.currentUser && c.currentUser.username) {
                                const fresh = userMap[c.currentUser.username];
                                if (fresh) {
                                    c.currentUser.tier = fresh.tier;
                                    c.currentUser.badge = fresh.badge;
                                    c.currentUser.rankClass = fresh.rankClass;
                                    c.currentUser.verified = fresh.verified;
                                    c.currentUser.avatar = fresh.avatar;
                                    c.currentUser.initials = fresh.avatar; 
                                }
                            }
                        });
                    }
                });
            }
        }

        if (sort === 'Most Commented') {
            posts.sort((a, b) => {
                const commentsA = a.comments ? a.comments.length : 0;
                const commentsB = b.comments ? b.comments.length : 0;
                return commentsB - commentsA;
            });
        }

        // Gets all the reviews posted by every user
        if (currentUser) {
            const globalPosts = await Post.find({})
                .populate('currentUser', 'avatar name username tier badge rankClass verified')
                .lean();
            if (globalPosts.length > 0) {
                currentUser.totalReviews = globalPosts.length;
                
                // Calculate Top Cuisine
                const cuisineCounts = {};
                globalPosts.forEach(post => {
                    const c = post.cuisine;
                    if (c) cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
                });
                if (Object.keys(cuisineCounts).length > 0) {
                     currentUser.topCuisine = Object.keys(cuisineCounts).reduce((a, b) => cuisineCounts[a] > cuisineCounts[b] ? a : b);
                } else {
                    currentUser.topCuisine = "None";
                }

                // Calculate Avg Rating
                const totalRating = globalPosts.reduce((acc, post) => acc + parseFloat(post.ratingValue || 0), 0);
                currentUser.avgRating = (totalRating / globalPosts.length).toFixed(1);

                // Calculate Locations count
                const uniqueLocations = new Set(globalPosts.map(p => p.location).filter(l => l));
                currentUser.locations = uniqueLocations.size;

                // Calculate Top Rated (Highest rated restaurant)
                const topRatedPost = globalPosts.reduce((prev, current) => (parseFloat(prev.ratingValue || 0) > parseFloat(current.ratingValue || 0)) ? prev : current);
                currentUser.topRated = topRatedPost.restaurant || "None";
            } else {
                currentUser.totalReviews = 0;
                currentUser.topCuisine = "None";
                currentUser.avgRating = 0;
                currentUser.locations = 0;
                currentUser.topRated = "None";
            }
        }

        // Loop through all posts to check ownership
        for (let i = 0; i < posts.length; i++) {
            // Check if the current user owns the post
            if (currentUser.email && posts[i].currentUser && posts[i].currentUser.email === currentUser.email) {
                posts[i].ownPost = true;
            } else {
                posts[i].ownPost = false;
            }
               }

        // Add user vote information to each post
        for (let post of posts) {
            const userVote = await Vote.findOne({
                userId: currentUser._id,
                postId: post._id
            }).lean();
            post.userVote = userVote ? userVote.type : null;
        }

        res.render("feed", {
            cuisines,
            locations,
            sortOptions,
            pageTitle: "Feed",
            activePage: "feed",
            currentUser,
            notifications: 0,
            posts: posts,
            selectedCuisine: cuisine,
            selectedLocation: location,
            selectedSort: sort,
            selectedSearch: searchTerm
        });

    } catch (err) {
        console.error("Error loading feed:", err);
        res.status(500).send("Server error");
    }
});

// Writing a review
app.get("/write-review", (req, res) => {
    res.render("write-review", {
        pageTitle: "Write Review",
        currentUser,
        cuisines,
        locations
    });
});

// Posting the review
app.post('/write-review', async (req, res) => { 
    try {
        let { restaurant, cuisine, customCuisine, location, customLocation, content, foodRating, serviceRating, ambianceRating, title } = req.body;

        // Handle Custom Cuisine
        if (cuisine === "Other" && customCuisine) {
            customCuisine = customCuisine.trim();
            // Capitalize first letter of each word so it matches display format in feed
            customCuisine = customCuisine.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
            
            if (!cuisines.includes(customCuisine)) {
                cuisines.push(customCuisine);
                cuisines.sort(); // Keep alphabetical
            }
            cuisine = customCuisine;
        }

        // Handle Custom Location
        if (location === "Other" && customLocation) {
            customLocation = customLocation.trim();
            // Capitalize first letter of each word so it matches display format in feed
            customLocation = customLocation.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

            if (!locations.includes(customLocation)) {
                locations.push(customLocation);
                locations.sort();
            }
            location = customLocation;
        }

        if (content && content.trim() !== '') {
            const service = parseFloat(serviceRating);
            const taste = parseFloat(foodRating);
            const ambiance = parseFloat(ambianceRating);
            const avgRating = ((service + taste + ambiance) / 3).toFixed(1);

            const newPost = {
                currentUser,
                restaurant,
                cuisine,
                location,
                title: title,
                content,
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐".repeat(Math.round(avgRating)),
                ratingValue: avgRating,
                ownPost: true,
                tags: [],
                scores: { service: service.toFixed(1), taste: taste.toFixed(1), ambiance: ambiance.toFixed(1) },
                likes: 0,
                dislikes: 0,
                comments: []
            };

            posts.unshift(newPost);

            const rev = await Post.create(newPost); 
            console.log("Post created:", rev._id);

            let nReviews = currentUser.totalReviews + 1;
            currentUser.totalReviews += 1;

            const result = await Profile.updateOne(
                { email: currentUser.email },        
                { $set: { totalReviews: nReviews } } 
            );

            if (result.modifiedCount === 0) {
                console.error("Failed to update totalReviews in the database.");
                return res.status(500).json({ message: "Failed to update reviews count." });
            }

            // Award points for writing review
            await updateUserReputation(currentUser.email, POINTS.WRITE_REVIEW);

            return res.redirect('/feed'); 
        } else {
            return res.status(400).json({ message: "Content is required." });
        }
    } catch (err) {
        console.error("Error writing review:", err);
        return res.status(500).json({ message: "Server error." });
    }
});
        
// Delete Review
app.delete('/delete-review/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        // Ownership check
        if (post.currentUser.email !== currentUser.email) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await Post.deleteOne({ _id: postId });
        
        // Decrement user reviews count
        let nReviews = currentUser.totalReviews - 1;
        if(nReviews < 0) nReviews = 0;
        
        currentUser.totalReviews = nReviews;

        await Profile.updateOne(
            { email: currentUser.email },        
            { $set: { totalReviews: nReviews } } 
        );
        
        // Deduct points for deleting review
        await updateUserReputation(currentUser.email, -POINTS.WRITE_REVIEW);

        res.json({ message: "Review deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Report Review
app.post('/report-review/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const { reason } = req.body;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Add a reports array if it doesn't exist, and push the new report
        await Post.updateOne(
            { _id: postId },
            { $push: { 
                    reports: {
                        reporterEmail: currentUser ? currentUser.email : "anonymous",
                        reason: reason || "No reason provided",
                        timestamp: new Date()
                    }
                } 
            }
        );

        res.status(200).json({ message: "Review successfully reported", success: true });
    } catch (err) {
        console.error("Error reporting review:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Edit Review Page
app.get('/edit-review/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).send("Post not found");
        }
        
        // Ownership check
        if (post.currentUser.email !== currentUser.email) {
            return res.status(403).send("Unauthorized");
        }

        res.render("write-review", {
            pageTitle: "Edit Review",
            currentUser,
            editing: true,
            post, 
            cuisines, 
            locations 
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// Update Review Page
app.post('/edit-review/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        
        let { restaurant, cuisine, customCuisine, location, customLocation, content, foodRating, serviceRating, ambianceRating, title } = req.body;
        
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).send("Post not found");
        }
         // Ownership check
         if (post.currentUser.email !== currentUser.email) {
            return res.status(403).send("Unauthorized");
        }

         // Handle Custom Cuisine
         if (cuisine === "Other" && customCuisine) {
            customCuisine = customCuisine.trim();
            customCuisine = customCuisine.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
            
            if (!cuisines.includes(customCuisine)) {
                cuisines.push(customCuisine);
                cuisines.sort();
            }
            cuisine = customCuisine;
        }

        // Handle Custom Location
        if (location === "Other" && customLocation) {
            customLocation = customLocation.trim();
            customLocation = customLocation.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));

            if (!locations.includes(customLocation)) {
                locations.push(customLocation);
                locations.sort();
            }
            location = customLocation;
        }

        const service = parseFloat(serviceRating);
        const taste = parseFloat(foodRating);
        const ambiance = parseFloat(ambianceRating);
        const avgRating = ((service + taste + ambiance) / 3).toFixed(1);
        
        const updatedPost = {
            restaurant,
            cuisine,
            location,
            title,
            content,
            edited: true,
            editedDate: new Date().toLocaleDateString(), 
            ratingStars: "⭐".repeat(Math.round(avgRating)),
            ratingValue: avgRating,
            scores: { service: service.toFixed(1), taste: taste.toFixed(1), ambiance: ambiance.toFixed(1) }
        };
        
        await Post.updateOne(
            { _id: postId },
            { $set: updatedPost }
        );
        
        res.redirect('/feed');
        
    } catch(err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// Voting route
app.post('/vote', async (req, res) => {
    try {
        const { postId, action } = req.body;

        if (!currentUser || !currentUser.email) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        if (!postId || !action) {
            return res.status(400).json({ message: "Post ID and action are required" });
        }

        if (action !== 'upvote' && action !== 'downvote') {
            return res.status(400).json({ message: "Invalid action" });
        }

        // Looks for post in existing collection
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Prevents user from voting on their review
        if (post.currentUser && post.currentUser.email === currentUser.email) {
            return res.status(403).json({ message: "You cannot vote on your own review" });
        }

        // Initialize userVotes
        if (!post.userVotes) {
            post.userVotes = {};
        }

        const userEmail = currentUser.email;
        const previousVote = post.userVotes[userEmail];

        let likesChange = 0;
        let dislikesChange = 0;
        let userVoteChange = 0; 

        // Handles vote logic
        if (previousVote === action) {
            // Removes user's vote if they do the same action
            if (action === 'upvote') {
                likesChange = -1;
            } else {
                dislikesChange = -1;
            }
            userVoteChange = -1;
            delete post.userVotes[userEmail];
        } else if (previousVote) {
            // Switches user's vote if action is different
            if (previousVote === 'upvote') {
                likesChange = -1;
                dislikesChange = 1;
            } else {
                likesChange = 1;
                dislikesChange = -1;
            }
            post.userVotes[userEmail] = action;
        } else {
            // Adds new vote if user has not yet made a vote
            if (action === 'upvote') {
                likesChange = 1;
            } else {
                dislikesChange = 1;
            }
            userVoteChange = 1;
            post.userVotes[userEmail] = action;
        }

        // Updates post votes and userVotes
        const updateObj = {
            $inc: {},
            $set: { userVotes: post.userVotes }
        };

        if (likesChange !== 0) {
            updateObj.$inc.likes = likesChange;
        }
        if (dislikesChange !== 0) {
            updateObj.$inc.dislikes = dislikesChange;
        }

        const result = await Post.updateOne(
            { _id: postId },
            updateObj
        );

        if (result.modifiedCount === 0) {
            return res.status(500).json({ message: "Failed to update vote" });
        }

        // Updates votes collection
        const currentVote = post.userVotes[userEmail];
        if (currentVote) {
            // Saves user's vote in votes collection if there was a vote made 
            await Vote.updateOne(
                { userId: currentUser._id, postId: postId },
                { 
                    $set: { 
                        userId: currentUser._id, 
                        postId: postId, 
                        type: currentVote,
                        userEmail: userEmail, 
                        date: new Date()
                    }
                },
                { upsert: true }
            );
        } else {
            // Deletes user's vote in votes collection if vote was removed
            await Vote.deleteOne({
                userId: currentUser._id,
                postId: postId
            });
        }

        
        if (userVoteChange !== 0) {
            const ownerField = action === 'upvote' ? 'upvotes' : 'downvotes';

            await Profile.updateOne(
                { email: post.currentUser.email },
                { $inc: { [ownerField]: userVoteChange } }
            );
        } else if (previousVote && previousVote !== action) {
            // Updates both counters if user switched votes
            const oldField = previousVote === 'upvote' ? 'upvotes' : 'downvotes';
            const newField = action === 'upvote' ? 'upvotes' : 'downvotes';

            await Profile.updateOne(
                { email: post.currentUser.email },
                {
                    $inc: {
                        [oldField]: -1,
                        [newField]: 1
                    }
                }
            );
            if (post.currentUser.email === currentUser.email) {
                currentUser[oldField] = (currentUser[oldField] || 0) - 1;
                currentUser[newField] = (currentUser[newField] || 0) + 1;
            }
        }

        // Award or deduct points for post owner, if not voting on own post
        if (post.currentUser.email !== currentUser.email) {
            // Helper to get point value for a vote type
            const getPointsValue = (voteType) => {
                if (voteType === 'upvote') return POINTS.RECEIVE_UPVOTE;
                if (voteType === 'downvote') return POINTS.RECEIVE_DOWNVOTE;
                return 0;
            };

            // Determines the final state of the vote after this action
            let finalVoteState = null;
            if (previousVote === action) {
                finalVoteState = null; 
            } else {
                finalVoteState = action; 
            }

            const oldPoints = getPointsValue(previousVote);
            const newPoints = getPointsValue(finalVoteState);
            const pointsDelta = newPoints - oldPoints;

            if (pointsDelta !== 0) {
                await updateUserReputation(post.currentUser.email, pointsDelta);
            }
        }

        // Gets updated post data
        const updatedPost = await Post.findById(postId);

        res.json({
            message: "Vote updated successfully",
            likes: updatedPost.likes,
            dislikes: updatedPost.dislikes,
            userVote: updatedPost.userVotes[userEmail] || null
        });

    } catch (err) {
        console.error("Error voting:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Comment functionality
app.post('/comment', async (req, res) => {
    try {
        const { postId, text } = req.body;

        if (!currentUser || !currentUser.email) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        if (!postId || !text || text.trim() === '') {
            return res.status(400).json({ message: "Post ID and comment text are required" });
        }

        const newComment = {
            currentUser: currentUser._id, 
            text: text.trim(),
            date: new Date().toLocaleDateString()
        };

        // Add comment to post
        const result = await Post.updateOne(
            { _id: postId },
            { $push: { comments: newComment } }
        );

        if (result.modifiedCount === 0) {
            return res.status(500).json({ message: "Failed to add comment" });
        }

        // Update user profile comment count
        await Profile.updateOne(
            { email: currentUser.email },
            { $inc: { comments: 1 } }
        );
        currentUser.comments = (currentUser.comments || 0) + 1;

        const updatedPost = await Post.findById(postId)
            .populate('comments.currentUser', 'name avatar rankClass email')
            .populate('currentUser', 'name email');

        let lastComment = updatedPost.comments[updatedPost.comments.length - 1].toObject();

        if (lastComment.currentUser && lastComment.currentUser.name) {
            lastComment.currentUser.initials = lastComment.currentUser.name
                .split(' ')
                .map(word => word[0].toUpperCase())
                .join('');
        } else {
            lastComment.currentUser.initials = '';
        }

        const d = new Date(lastComment.date);
        lastComment.date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

        await updateUserReputation(currentUser.email, POINTS.ADD_COMMENT);
        if (updatedPost.currentUser._id.toString() !== currentUser._id.toString()) {
            await updateUserReputation(updatedPost.currentUser.email, POINTS.RECEIVE_COMMENT);
        }

        res.json({
            message: "Comment added successfully",
            comment: lastComment, 
            commentCount: updatedPost.comments.length
        });

    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete Comment
app.delete('/comment/:postId/:commentIndex', async (req, res) => {
    try {
        const { postId, commentIndex } = req.params;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments[commentIndex];
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Ownership check
        if (comment.currentUser.email !== currentUser.email) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Remove comment by index
        post.comments.splice(commentIndex, 1);
        await Post.updateOne(
            { _id: postId },
            { $set: { comments: post.comments } }
        );

        res.json({ message: "Comment deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Edit Comment
app.patch('/comment/:postId/:commentIndex', async (req, res) => {
    try {
        const { postId, commentIndex } = req.params;
        const { text } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments[commentIndex];
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Ownership check
        if (comment.currentUser.email !== currentUser.email) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Update comment text
        await Post.updateOne(
            { _id: postId },
            { $set: { [`comments.${commentIndex}.text`]: text.trim() } }
        );

        res.json({ message: "Comment updated", text: text.trim() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Notifications
// Get Recent Notifications 
app.get('/notifications', async (req, res) => {
    try {
        // Allows viewing of notifications for user that is logged in
        if (!currentUser || !currentUser.email) {
            return res.redirect('/');
        }

        // Gets user reviews
        const userReviews = await Post.find({ "currentUser": currentUser._id })
            .populate('currentUser', 'avatar name username tier badge rankClass verified')
            .lean();

        // Gets posts where user commented
        const commentedPosts = await Post.find({
            "comments.currentUser": currentUser._id
        })
        .populate('currentUser', 'avatar name username tier badge rankClass verified')
        .lean();

        const activities = [];

        // Adds review activities
        userReviews.forEach(review => {
            activities.push({
                icon: "✍️",
                title: `You reviewed ${review.restaurant}`,
                date: review.date,
                rating: review.ratingValue,
                stars: review.ratingStars,
                reviewTitle: review.title,
                content: review.content.substring(0, 150) + (review.content.length > 150 ? "..." : ""),
                footer: {
                    likes: review.likes || 0,
                    comments: review.comments ? review.comments.length : 0
                }
            });

            // Adds incoming comments on user's reviews
            if (review.comments && review.comments.length > 0) {
                review.comments.forEach(comment => {
                    if (comment.currentUser.email !== currentUser.email) {
                        activities.push({
                            icon: "💬",
                            title: `New comment from ${comment.currentUser.name} on your review of ${review.restaurant}`,
                            date: comment.date,
                            content: comment.text,
                            footer: { author: comment.currentUser.name }
                        });
                    }
                });
            }
        });

        // Adds incoming votes on user's reviews
        const userPostIds = userReviews.map(p => p._id);
        const incomingVotes = await Vote.find({
            postId: { $in: userPostIds },
            userId: { $ne: currentUser._id }
        })
        .populate('currentUser', 'avatar name username tier badge rankClass verified')
        .lean();

        incomingVotes.forEach(vote => {
            if (vote.date) { // Only show votes with timestamps
                const relatedPost = userReviews.find(p => p._id.toString() === vote.postId.toString())
                    .populate('currentUser', 'avatar name username tier badge rankClass verified')
                    .lean();
                if (relatedPost) {
                    activities.push({
                        icon: vote.type === 'upvote' ? '🔺' : '🔻',
                        title: `Received ${vote.type} on your review of ${relatedPost.restaurant}`,
                        date: vote.date,
                        content: relatedPost.title || relatedPost.content.substring(0, 50) + "..."
                    });
                }
            }
        });

        // Adds outgoing comment activities
        commentedPosts.forEach(post => {
            const userComments = post.comments.filter(comment =>
                comment.currentUser.email === currentUser.email
            );

            userComments.forEach(comment => {
                activities.push({
                    icon: "💬",
                    title: `You commented on ${post.restaurant}`,
                    date: comment.date,
                    content: comment.text
                });
            });
        });

        // Calculates the difference between two timestamps, ensures recent ones appear first
        activities.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        res.render("notifications", {
            pageTitle: "Notifications",
            activePage: "notifs",
            currentUser,
            notifications: activities
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        return res.status(500).send("Server error");
    }
});

// Computes user stats
async function computeUserStats(userEmail) {
    try {
        // Gets user
        const userData = await Profile.findOne({ email: userEmail }).lean();
        if (!userData) return null;

        const userId = userData._id;

        // Gets all reviews made by user
        const userReviews = await Post.find({ "currentUser": userId })
            .populate('currentUser', 'avatar name username tier badge rankClass verified')
            .lean();

        // Gets all posts where user commented
        const commentedPosts = await Post.find({
            "comments.currentUser": userId
        })
        .populate('currentUser', 'avatar name username tier badge rankClass verified')
        .lean();

        // Gets total reviews and comments made by user
        const totalReviews = userReviews.length;
        const totalComments = commentedPosts.reduce((sum, post) => {
            return sum + post.comments.filter(comment => comment.currentUser === userId).length;
        }, 0);

        // Computes for average rating of reviews made by user
        const avgRating = totalReviews > 0 ?
            userReviews.reduce((sum, review) => sum + review.ratingValue, 0) / totalReviews : 0;

        // Counts cuisines that user made reviews on
        const cuisineCount = {};
        userReviews.forEach(review => {
            if (review.cuisine) {
                cuisineCount[review.cuisine] = (cuisineCount[review.cuisine] || 0) + 1;
            }
        });

        // Count locations that user made reviews on
        const locationCount = {};
        userReviews.forEach(review => {
            if (review.location) {
                locationCount[review.location] = (locationCount[review.location] || 0) + 1;
            }
        });

        // Gets top cuisine based on user's reviews
        const topCuisine = Object.keys(cuisineCount).length > 0 ?
            Object.keys(cuisineCount).reduce((a, b) => cuisineCount[a] > cuisineCount[b] ? a : b) : 'None';

        // Gets count of unique location based on user's reviews
        const locations = Object.keys(locationCount).length;

        // Gets highest-rated restaurant of user
        const topRated = totalReviews > 0 ? userReviews.reduce((prev, current) =>
            (prev.ratingValue > current.ratingValue) ? prev : current
        ).restaurant : 'None';

        // Gets total upvotes and downvotes from user posts made by other users
        const upvotes = userReviews.reduce((sum, review) => sum + (review.likes || 0), 0);
        const downvotes = userReviews.reduce((sum, review) => sum + (review.dislikes || 0), 0);

        // Gets a list of the top 3 cuisines of the user
        const topCuisines = Object.entries(cuisineCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // Gets a list of the top 3 locations of the user
        const topLocations = Object.entries(locationCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        return {
            totalReviews,
            avgRating: Math.round(avgRating * 10) / 10,
            topCuisine,
            locations,
            topRated,
            upvotes,
            downvotes,
            comments: totalComments,
            points: userData.points || 0,
            topCuisines,
            topLocations
        };

    } catch (err) {
        console.error("Error computing user stats:", err);
        return null;
    }
}

// Gets tier progress
function getTierProgress(points) { 
    const tiers = [
        { name: "Bronze", min: 0, max: 49, icon: "🥉", color: "bronze" },
        { name: "Silver", min: 50, max: 149, icon: "🥈", color: "silver" },
        { name: "Gold", min: 150, max: 299, icon: "🥇", color: "gold" },
        { name: "Platinum", min: 300, max: 499, icon: "💎", color: "platinum" },
        { name: "Diamond", min: 500, max: 999, icon: "💍", color: "diamond" },
        { name: "Master", min: 1000, max: Infinity, icon: "🏆", color: "master" }
    ];

    let currentTier = tiers[0];
    let nextTier = tiers[1];

    for (let i = 0; i < tiers.length; i++) {
        if (points >= tiers[i].min) {
            currentTier = tiers[i];
            nextTier = tiers[i + 1] || null;
        }
    }

    const progress = nextTier ?
        ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

    return {
        currentTier: currentTier.name,
        currentTierIcon: currentTier.icon,
        currentTierColor: currentTier.color,
        nextTier: nextTier ? nextTier.name : null,
        nextTierIcon: nextTier ? nextTier.icon : null,
        progress: Math.min(progress, 100),
        pointsToNext: nextTier ? nextTier.min - points : 0
    };
}

// User profile-reviews
app.get('/userprofile-reviews', async (req, res) => {
    try {
        const reviews = await Post.find({ "currentUser": currentUser._id })
          .populate('currentUser', 'avatar name username tier badge rankClass verified email')
          .lean();

        // Loops through all reviews
        for (let i = 0; i < reviews.length; i++) {
            reviews[i].ownPost = true; // Marks all as owned
        }

        // Adds user vote information to each review
        for (let review of reviews) {
            const userVote = await Vote.findOne({
                userId: currentUser._id,
                postId: review._id
            }).lean();
            review.userVote = userVote ? userVote.type : null;
        }

        // Calculates user stats
        const userStats = await computeUserStats(currentUser.email);
        const tierProgress = getTierProgress(userStats ? userStats.points : 0);

        if (userStats) {
            const updatedUser = { ...currentUser, ...userStats, ...tierProgress };
            currentUser = updatedUser;
        }

        res.render("userprofile-reviews", {
            pageTitle: "Profile-Reviews",
            activePage: "profile",
            currentUser,
            reviews: reviews
        });
    } catch (err) {
        console.error("Error loading user reviews:", err);
        res.status(500).send("Server error");
    }
});

// Profile Update Route
app.post('/update-profile', async (req, res) => {
    try {
        const { name, username, email, bio } = req.body;

        if (!currentUser || !currentUser.email) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Checks if username is already taken (if changed)
        if (username !== currentUser.username) {
            const existingUser = await Profile.findOne({ username: username }).lean();
            if (existingUser) {
                return res.status(400).json({ message: "Username already taken" });
            }
        }

        // Checks if email is already taken (if changed)
        if (email !== currentUser.email) {
            const existingUser = await Profile.findOne({ email: email }).lean();
            if (existingUser) {
                return res.status(400).json({ message: "Email already taken" });
            }
        }

        // Updates user profile
        const updateData = {
            name: name || currentUser.name,
            username: username || currentUser.username,
            email: email || currentUser.email,
            bio: bio || currentUser.bio
        };

        // Recalculates avatar and initials based on new name
        updateData.avatar = updateData.name.split(' ').map(word => word[0].toUpperCase()).join('');
        updateData.initials = updateData.name.split(' ').map(word => word[0].toUpperCase()).join('');

        const oldEmail = currentUser.email;

        await Profile.updateOne(
            { email: currentUser.email },
            { $set: updateData }
        );

        // Updates email in all posts collection if email changed
        if (email && email !== oldEmail) {
            await Post.updateMany(
                { "currentUser.email": oldEmail },
                { $set: { "currentUser.email": email } }
            );

            await Post.updateMany(
                { "comments.currentUser.email": oldEmail },
                { $set: { "comments.$[elem].currentUser.email": email } },
                { arrayFilters: [{ "elem.currentUser.email": oldEmail }] }
            );
        }

        // Updates name and avatar in all posts and comments
        await Post.updateMany(
            { "currentUser.email": updateData.email },
            { $set: { 
                "currentUser.name": updateData.name,
                "currentUser.avatar": updateData.avatar
            } }
        );

        await Post.updateMany(
            { "comments.currentUser.email": updateData.email },
            { $set: { 
                "comments.$[elem].currentUser.name": updateData.name,
                "comments.$[elem].currentUser.avatar": updateData.avatar,
                "comments.$[elem].currentUser.initials": updateData.initials
            } },
            { arrayFilters: [{ "elem.currentUser.email": updateData.email }] }
        );

        Object.assign(currentUser, updateData);

        res.json({ message: "Profile updated successfully" });

    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Settings 
app.get('/settings', (req, res) => {
    res.render("settings", {
    pageTitle: 'Settings',
    activePage: "settings",
    currentUser,
    settings: {
        publicProfile: true,
        showTierBadge: true
    }
    });
});

// Server activation
app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});
