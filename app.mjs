import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import { connectToMongo, getDb } from "./model/conn.js";
import { ObjectId } from "mongodb";

const app = express();
const port = 3000;
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
        const db = getDb();
        const users = db.collection("profile");
        
        const user = await users.findOne({ email: userEmail });
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
        
        await users.updateOne(
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
            const db = getDb();
            const users = db.collection("profile");
            const freshUser = await users.findOne({ email: currentUser.email });
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

// handlebars
app.engine("hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
        formatDate: (date) => {
            if (!date) return '';
            const d = new Date(date);
            return isNaN(d.getTime()) ? date : d.toLocaleDateString();
        },
        eq: (a, b) => a == b,
        toString: (obj) => obj ? obj.toString() : '',
        userVoteClass: (post, voteType) => {
            // Handle Handlebars options object or missing voteType
            if (typeof voteType !== 'string') {
                voteType = 'upvote';
            }
            if (post.userVote === voteType) {
                return 'voted';
            }
            return '';
        },
        renderStars: (rating) => {
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
        const pastDate = new Date(date);
        const now = new Date();
        const seconds = Math.floor((now - past) / 1000);

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
        const db = getDb();
        const postsCollection = db.collection("posts");
        const votesCollection = db.collection("votes");
        const allPosts = await postsCollection.find({}).toArray();

        // Calculate Stats
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
                const userVote = await votesCollection.findOne({
                    userId: currentUser._id,
                    postId: post._id
                });
                post.userVote = userVote ? userVote.type : null;
            } else {
                post.userVote = null;
            }
        }

        // Top Reviews (Sort by rating descending)
        // Clone array before sorting to avoid modifying original list if needed later
        const topReviews = [...allPosts].sort((a, b) => parseFloat(b.ratingValue) - parseFloat(a.ratingValue)).slice(0, 3);

        res.render('landing', {
            layout: false,
            stats: {
                reviews: totalReviews,
                restaurants: restaurants, // Approximate unique count
                locations: locations,
                avgRating: avgRating
            },
            topReviews: topReviews,
            currentUser // Pass current user to view
        });
    } catch(err) {
        console.error("Error loading landing page:", err);
        // Fallback to static if DB fails, or show error
        res.status(500).send("Error loading landing page");
    }
});


app.get('/community-reviews', async (req, res) => {
    try {
        await refreshCurrentUser(); // Fetch fresh user data

        const db = getDb();
        const postsCollection = db.collection("posts");
        const votesCollection = db.collection("votes"); // Need votes collection
        const allPosts = await postsCollection.find({}).sort({ _id: -1 }).toArray();
        
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
                const userVote = await votesCollection.findOne({
                    userId: currentUser._id,
                    postId: post._id
                });
                post.userVote = userVote ? userVote.type : null;
            } else {
                post.userVote = null;
            }
        }

        res.render('community-reviews', {
            layout: false,
            posts: allPosts,
            currentUser // Pass current user to view
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
        
        const db = getDb();
        const users = db.collection("profile");
        // Also delete their reviews? Or keep them anonymized? 
        // For now, just delete the user profile as requested.
        
        await users.deleteOne({ username: currentUser.username });
        
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
        const db = getDb();
        const usersCollection = db.collection("profile");
        const postsCollection = db.collection("posts");

        // Find user
        const user = await usersCollection.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Find all posts by this user to calculate stats
        // Note: posts collection stores author in 'currentUser' field or we might need to query by 'currentUser.username'
        // Based on seed.js, posts have `currentUser` object embedded.
        const userPosts = await postsCollection.find({ "currentUser.username": username }).toArray();

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

// for MongoDB Connection
connectToMongo((err) => {
    if(err) {
        console.log("error occurred");
        console.error(err);
        process.exit();
    }
    console.log("Connected to MongoDB server");
});

// Sign Up
app.post("/signup", async (req, res) => {
    try {
        const db = getDb();
        const users = db.collection("profile");
        const { name, email, password } = req.body;

        // check if user already exists
        const existingUser = await users.findOne({ email });
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
            // achievements: ["✍ First Review", "👍 Community Fave", "🔥 Viral Post"]

            // topCuisines: [
            // { name: "Indian", count: 1 },
            // { name: "Japanese", count: 1 }
            // ],

            // topLocations: [
            // { name: "Makati", count: 1 },
            // { name: "BGC", count: 1 }
            // ]
        };

        // update the currentUser object
        currentUser = newUser;

        // insert user
        const result = await users.insertOne(newUser); 

        console.log("User created:", result.insertedId);
        res.json({ message: "Signup successful" });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login
app.post("/login", async (req, res) => {
    try {
        const db = getDb();
        const users = db.collection("profile");

        const { email, password } = req.body;
        const acc = await users.findOne({
            email: email,
            password: password
        });

        if (!acc) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        currentUser = acc;

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
        const db = getDb();
        const users = db.collection("profile");

        const user = await users.findOne({ email: email });

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

        const db = getDb();
        const users = db.collection("profile");

        const result = await users.updateOne(
            { email: email },
            { $set: { password: newPassword } }
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

        const db = getDb();
        const users = db.collection("profile");

        // Verify current password first
        if (currentUser.password !== currentPassword) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const result = await users.updateOne(
            { email: currentUser.email },
            { $set: { password: newPassword } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        // Update local session mock
        currentUser.password = newPassword;

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

        const db = getDb();  
        const allPosts = db.collection("posts");
        const votesCollection = db.collection("votes");

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

        let cursor = allPosts.find(query);

        if (sort === 'Top Rated') {
            cursor = cursor.sort({ ratingValue: -1 });
        } else {
            cursor = cursor.sort({ _id: -1 });
        }

        posts = await cursor.toArray();

        // Refresh post author data (badges/tiers) for display
        if (posts.length > 0) {
            const usersCollection = db.collection("profile");
            
            // Collect all unique usernames (post authors + comment authors)
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
                const freshUsers = await usersCollection.find({ username: { $in: [...usernames] } }).toArray();
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
                            p.currentUser.rankClass = fresh.rankClass; // e.g. "bronze", "silver"
                            p.currentUser.verified = fresh.verified;
                            p.currentUser.avatar = fresh.avatar; // Update avatar if changed
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
                                    c.currentUser.avatar = fresh.avatar; // Update avatar too
                                    c.currentUser.initials = fresh.avatar; // Ensure consistency
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

        // Calculate stats for all the posts aka. global posts
        if (currentUser) {
            const globalPosts = await allPosts.find({}).toArray();
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
            // console.log(`Post ${posts[i]._id} owned by ${posts[i].currentUser?.email}: ${posts[i].ownPost}`);
        }

        // Add user vote information to each post
        for (let post of posts) {
            const userVote = await votesCollection.findOne({
                userId: currentUser._id,
                postId: post._id
            });
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

// writing a review
app.get("/write-review", (req, res) => {
    res.render("write-review", {
        pageTitle: "Write Review",
        currentUser,
        cuisines,
        locations
    });
});

// posting the review
app.post('/write-review', async (req, res) => { //!CHECK
    try {
        const db = getDb();
        const users = db.collection("profile");
        const uploadPost = db.collection("posts");
        let { restaurant, cuisine, customCuisine, location, customLocation, content, foodRating, serviceRating, ambianceRating, title } = req.body;

        // Handle Custom Cuisine
        if (cuisine === "Other" && customCuisine) {
            customCuisine = customCuisine.trim();
            // Capitalize first letter of each word
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
            // Capitalize first letter of each word
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

            const rev = await uploadPost.insertOne(newPost); 
            console.log("User created:", rev.insertedId);

            let nReviews = currentUser.totalReviews + 1;
            currentUser.totalReviews += 1;

            const result = await users.updateOne(
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
        const db = getDb();
        const postsCollection = db.collection("posts");
        const users = db.collection("profile");
        const postId = req.params.id;

        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        // Ownership check
        if (post.currentUser.email !== currentUser.email) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await postsCollection.deleteOne({ _id: new ObjectId(postId) });
        
        // Decrement user reviews count
        let nReviews = currentUser.totalReviews - 1;
        if(nReviews < 0) nReviews = 0;
        
        currentUser.totalReviews = nReviews;

        await users.updateOne(
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
        const db = getDb();
        const postsCollection = db.collection("posts");
        const postId = req.params.id;
        const { reason } = req.body;

        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Add a reports array if it doesn't exist, and push the new report
        await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { 
                $push: { 
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
        const db = getDb();
        const postsCollection = db.collection("posts");
        const postId = req.params.id;
        
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

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

// Update Review
app.post('/edit-review/:id', async (req, res) => {
    try {
        const db = getDb();
        const postsCollection = db.collection("posts");
        const postId = req.params.id;
        
        let { restaurant, cuisine, customCuisine, location, customLocation, content, foodRating, serviceRating, ambianceRating, title } = req.body;
        
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
        
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
        
        await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
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
        const db = getDb();
        const postsCollection = db.collection("posts");
        const votesCollection = db.collection("votes");
        const users = db.collection("profile");
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

        // Find post
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // --- NEW: Prevent voting on own post ---
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
        let userVoteChange = 0; // user's total votes

        // Handle vote logic
        if (previousVote === action) {
            // User is trying to vote the same way again - remove their vote
            if (action === 'upvote') {
                likesChange = -1;
            } else {
                dislikesChange = -1;
            }
            userVoteChange = -1;
            delete post.userVotes[userEmail];
        } else if (previousVote) {
            // User had a different vote - switch votes
            if (previousVote === 'upvote') {
                likesChange = -1;
                dislikesChange = 1;
            } else {
                likesChange = 1;
                dislikesChange = -1;
            }
            post.userVotes[userEmail] = action;
        } else {
            // User hasn't voted before - add new vote
            if (action === 'upvote') {
                likesChange = 1;
            } else {
                dislikesChange = 1;
            }
            userVoteChange = 1;
            post.userVotes[userEmail] = action;
        }

        // Update post votes and userVotes
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

        const result = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            updateObj
        );

        if (result.modifiedCount === 0) {
            return res.status(500).json({ message: "Failed to update vote" });
        }

        // Update votes collection
        const currentVote = post.userVotes[userEmail];
        if (currentVote) {
            // User has a vote - save or update in votes collection
            await votesCollection.updateOne(
                { userId: currentUser._id, postId: new ObjectId(postId) },
                { 
                    $set: { 
                        userId: currentUser._id, 
                        postId: new ObjectId(postId), 
                        type: currentVote,
                        userEmail: userEmail, // for easier querying
                        date: new Date() // Add timestamp for activity tracking
                    }
                },
                { upsert: true }
            );
        } else {
            // User removed their vote - delete from votes collection
            await votesCollection.deleteOne({
                userId: currentUser._id,
                postId: new ObjectId(postId)
            });
        }

        
        if (userVoteChange !== 0) {
            const ownerField = action === 'upvote' ? 'upvotes' : 'downvotes';

            await users.updateOne(
                { email: post.currentUser.email },
                { $inc: { [ownerField]: userVoteChange } }
            );
        } else if (previousVote && previousVote !== action) {
            // User switched votes - update both counters
            const oldField = previousVote === 'upvote' ? 'upvotes' : 'downvotes';
            const newField = action === 'upvote' ? 'upvotes' : 'downvotes';

            await users.updateOne(
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

        // Award/Dedudct points for post owner (if not voting on own post)
        if (post.currentUser.email !== currentUser.email) {
            // Helper to get point value for a vote type
            const getPointsValue = (voteType) => {
                if (voteType === 'upvote') return POINTS.RECEIVE_UPVOTE;
                if (voteType === 'downvote') return POINTS.RECEIVE_DOWNVOTE;
                return 0;
            };

            // Determine the final state of the vote after this action
            let finalVoteState = null;
            if (previousVote === action) {
                finalVoteState = null; // Removing vote
            } else {
                finalVoteState = action; // Setting or changing vote
            }

            const oldPoints = getPointsValue(previousVote);
            const newPoints = getPointsValue(finalVoteState);
            const pointsDelta = newPoints - oldPoints;

            if (pointsDelta !== 0) {
                await updateUserReputation(post.currentUser.email, pointsDelta);
            }
        }

        // Get updated post data
        const updatedPost = await postsCollection.findOne({ _id: new ObjectId(postId) });

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
        const db = getDb();
        const postsCollection = db.collection("posts");
        const users = db.collection("profile");
        const { postId, text } = req.body;

        if (!currentUser || !currentUser.email) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        if (!postId || !text || text.trim() === '') {
            return res.status(400).json({ message: "Post ID and comment text are required" });
        }

        // Create new comment
        const newComment = {
            currentUser: {
                name: currentUser.name,
                avatar: currentUser.avatar,
                rankClass: currentUser.rankClass,
                initials: currentUser.name.split(' ').map(word => word[0].toUpperCase()).join(''),
                email: currentUser.email
            },
            text: text.trim(),
            date: new Date().toLocaleDateString()
        };

        // Add comment to post
        const result = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $push: { comments: newComment } }
        );

        if (result.modifiedCount === 0) {
            return res.status(500).json({ message: "Failed to add comment" });
        }

        await users.updateOne(
            { email: currentUser.email },
            { $inc: { comments: 1 } }
        );

        currentUser.comments = (currentUser.comments || 0) + 1;

        const updatedPost = await postsCollection.findOne({ _id: new ObjectId(postId) });

        // Update reputation for the comment author
        await updateUserReputation(currentUser.email, POINTS.ADD_COMMENT);

        // Update reputation for the post author (if not self)
        if (updatedPost && updatedPost.currentUser && updatedPost.currentUser.email !== currentUser.email) {
            await updateUserReputation(updatedPost.currentUser.email, POINTS.RECEIVE_COMMENT);
        }

        res.json({
            message: "Comment added successfully",
            comment: newComment,
            commentCount: updatedPost.comments.length
        });

    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// Notifications
// Get Recent Notifications 
app.get('/notifications', async (req, res) => {
    try {
        const db = getDb();
        const postsCollection = db.collection("posts");
        const votesCollection = db.collection("votes");

        // User must be logged in to view notifications
        if (!currentUser || !currentUser.email) {
            return res.redirect('/');
        }

        // Get user reviews
        const userReviews = await postsCollection.find({ "currentUser.email": currentUser.email }).toArray();

        // Get posts where user commented
        const commentedPosts = await postsCollection.find({
            "comments.currentUser.email": currentUser.email
        }).toArray();

        const activities = [];

        // Add review activities
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

            // Add incoming comments on user's reviews
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

        // Add incoming votes on user's reviews
        const userPostIds = userReviews.map(p => p._id);
        const incomingVotes = await votesCollection.find({
            postId: { $in: userPostIds },
            userId: { $ne: currentUser._id }
        }).toArray();

        incomingVotes.forEach(vote => {
            if (vote.date) { // Only show votes with timestamps
                const relatedPost = userReviews.find(p => p._id.toString() === vote.postId.toString());
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

        // Add outgoing comment activities
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

// compute user stats
async function computeUserStats(userEmail) {
    try {
        const db = getDb();
        const postsCollection = db.collection("posts");
        const users = db.collection("profile");

        // Get user
        const userData = await users.findOne({ email: userEmail });
        if (!userData) return null;

        // Get all reviews by user
        const userReviews = await postsCollection.find({ "currentUser.email": userEmail }).toArray();

        // Get all posts where user commented
        const commentedPosts = await postsCollection.find({
            "comments.currentUser.email": userEmail
        }).toArray();

        // Calculate stats
        const totalReviews = userReviews.length;
        const totalComments = commentedPosts.reduce((sum, post) => {
            return sum + post.comments.filter(comment => comment.currentUser.email === userEmail).length;
        }, 0);

        const avgRating = totalReviews > 0 ?
            userReviews.reduce((sum, review) => sum + review.ratingValue, 0) / totalReviews : 0;

        // Count cuisines
        const cuisineCount = {};
        userReviews.forEach(review => {
            if (review.cuisine) {
                cuisineCount[review.cuisine] = (cuisineCount[review.cuisine] || 0) + 1;
            }
        });

        // Count locs
        const locationCount = {};
        userReviews.forEach(review => {
            if (review.location) {
                locationCount[review.location] = (locationCount[review.location] || 0) + 1;
            }
        });

        // Get top cuisine
        const topCuisine = Object.keys(cuisineCount).length > 0 ?
            Object.keys(cuisineCount).reduce((a, b) => cuisineCount[a] > cuisineCount[b] ? a : b) : 'None';

        // Get unique locs count
        const locations = Object.keys(locationCount).length;

        // Get top rated resto
        const topRated = totalReviews > 0 ? userReviews.reduce((prev, current) =>
            (prev.ratingValue > current.ratingValue) ? prev : current
        ).restaurant : 'None';

        // Calculate total upvotes and downvotes from user posts
        const upvotes = userReviews.reduce((sum, review) => sum + (review.likes || 0), 0);
        const downvotes = userReviews.reduce((sum, review) => sum + (review.dislikes || 0), 0);

        // Get top cuisines
        const topCuisines = Object.entries(cuisineCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // Get top locs
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

// get tier progress
function getTierProgress(points) { // check kung ok points for tiers
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

//UserProfile-Reviews
app.get('/userprofile-reviews', async (req, res) => {
    try {
        const db = getDb();
        const postsCollection = db.collection("posts");
        const votesCollection = db.collection("votes");
        const reviews = await postsCollection.find({ "currentUser.email": currentUser.email }).toArray();

        // Loop through all reviews
        for (let i = 0; i < reviews.length; i++) {
            reviews[i].ownPost = true; // Mark all as owned
        }

        // Add user vote information to each review
        for (let review of reviews) {
            const userVote = await votesCollection.findOne({
                userId: currentUser._id,
                postId: review._id
            });
            review.userVote = userVote ? userVote.type : null;
        }

        // Calculate user stats
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
        const db = getDb();
        const users = db.collection("profile");
        const { name, username, email, bio } = req.body;

        if (!currentUser || !currentUser.email) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Check if username is already taken (if changed)
        if (username !== currentUser.username) {
            const existingUser = await users.findOne({ username: username });
            if (existingUser) {
                return res.status(400).json({ message: "Username already taken" });
            }
        }

        // Check if email is already taken (if changed)
        if (email !== currentUser.email) {
            const existingUser = await users.findOne({ email: email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already taken" });
            }
        }

        // Update user profile
        const updateData = {
            name: name || currentUser.name,
            username: username || currentUser.username,
            email: email || currentUser.email,
            bio: bio || currentUser.bio
        };

        // Recalculate avatar and initials based on new name
        updateData.avatar = updateData.name.split(' ').map(word => word[0].toUpperCase()).join('');
        updateData.initials = updateData.name.split(' ').map(word => word[0].toUpperCase()).join('');

        const oldEmail = currentUser.email;

        await users.updateOne(
            { email: currentUser.email },
            { $set: updateData }
        );

        // update email in all posts collection if email changed
        if (email && email !== oldEmail) {
            const postsCollection = db.collection("posts");
            await postsCollection.updateMany(
                { "currentUser.email": oldEmail },
                { $set: { "currentUser.email": email } }
            );

            await postsCollection.updateMany(
                { "comments.currentUser.email": oldEmail },
                { $set: { "comments.$[elem].currentUser.email": email } },
                { arrayFilters: [{ "elem.currentUser.email": oldEmail }] }
            );
        }

        // Update name and avatar in all posts and comments
        const postsCollection = db.collection("posts");
        await postsCollection.updateMany(
            { "currentUser.email": updateData.email },
            { $set: { 
                "currentUser.name": updateData.name,
                "currentUser.avatar": updateData.avatar
            } }
        );

        await postsCollection.updateMany(
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

// server activation
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
