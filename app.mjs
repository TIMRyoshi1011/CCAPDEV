import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import { connectToMongo, getDb } from "./db/conn.js";
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

// current active user
let currentUser = {};

// current posts
let posts = [];

// handlebars
app.engine("hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
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
        }
    },
    layoutsDir: path.join(__dirname, "views/layouts")
}));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static('public')); // launches the html files

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
            points: 0,
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
    const { email, newPassword } = req.body;

    try {
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
            return res.status(401).json({ message: "Not logged in." });
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
app.get("/feed", async (req, res) => { //!CHECK
    try {
        const db = getDb(); 
        const allPosts = db.collection("posts");
        const votesCollection = db.collection("votes");

        const { cuisine, location, sort } = req.query;
        let query = {};

        if (cuisine && cuisine !== '') {
            query.cuisine = cuisine;
        }

        if (location && location !== '') {
            query.location = location;
        }

        let cursor = allPosts.find(query);

        if (sort === 'Top Rated') {
            cursor = cursor.sort({ ratingValue: -1 });
        } else {
            cursor = cursor.sort({ _id: -1 });
        }

        posts = await cursor.toArray();

        if (sort === 'Most Commented') {
            posts.sort((a, b) => {
                const commentsA = a.comments ? a.comments.length : 0;
                const commentsB = b.comments ? b.comments.length : 0;
                return commentsB - commentsA;
            });
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
            selectedSort: sort
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

        
        if (userVoteChange !== 0) {
            const userUpdateField = action === 'upvote' ? 'upvotes' : 'downvotes';
            await users.updateOne(
                { email: currentUser.email },
                { $inc: { [userUpdateField]: userVoteChange } }
            );
            currentUser[userUpdateField] = (currentUser[userUpdateField] || 0) + userVoteChange;
        } else if (previousVote && previousVote !== action) {
            // User switched votes - update both counters
            const oldField = previousVote === 'upvote' ? 'upvotes' : 'downvotes';
            const newField = action === 'upvote' ? 'upvotes' : 'downvotes';

            await users.updateOne(
                { email: currentUser.email },
                {
                    $inc: {
                        [oldField]: -1,
                        [newField]: 1
                    }
                }
            );
            currentUser[oldField] = (currentUser[oldField] || 0) - 1;
            currentUser[newField] = (currentUser[newField] || 0) + 1;
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
                initials: currentUser.name.split(' ').map(word => word[0].toUpperCase()).join('')
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
app.get('/notifications', (req, res) => {
    res.render("notifications", {
        pageTitle: "Notifications",
        activePage: "notifs",
        currentUser,
        // notifications: [
        //     {
        //     icon: "🖋",
        //     message: "You left a review for <highlight>Yabu</highlight>",
        //     timestamp: "2 minutes ago",
        //     unread: true
        //     },
        //     {
        //     icon: "🖋",
        //     message: "You left a review for <highlight>Kodawari</highlight>",
        //     timestamp: "1 week ago",
        //     unread: false
        //     },
        //     {
        //     icon: "💬",
        //     message: "<highlight>Lee Dokyeom</highlight> left a comment under your review on <highlight>Kodawari</highlight>",
        //     timestamp: "1 day ago",
        //     unread: false
        //     },
        //     {
        //     icon: "🔺",
        //     message: "<highlight>Carlo Dela Cruz</highlight> upvoted your review on <highlight>Yabu</highlight>",
        //     timestamp: "4 days ago",
        //     unread: false
        //     },
        //     {
        //     icon: "🔻",
        //     message: "<highlight>Charles Sanchez</highlight> downvoted your review on <highlight>Kodawari</highlight>",
        //     timestamp: "4 days ago",
        //     unread: true
        //     },
        //     {
        //     icon: "🌟",
        //     message: "Your status has been upgraded to the <highlight>Bronze tier</highlight>",
        //     timestamp: "1 week ago",
        //     unread: false
        //     }
        // ]
        });
});

//UserProfile-Reviews
app.get('/userprofile-reviews', async (req, res) => {
    try {
        const db = getDb();
        const postsCollection = db.collection("posts");
        const reviews = await postsCollection.find({ "currentUser.email": currentUser.email }).toArray();
        
        // Loop through all reviews (all owned by user since we queried by their email)
        for (let i = 0; i < reviews.length; i++) {
            reviews[i].ownPost = true; // Mark all as owned
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

app.get('/userprofile-activity', (req, res) => {
    res.render("userprofile-activity", {
        pageTitle: "Profile-Activity",
        activePage: "profile",
        currentUser
        // activities: [
        //     {
        //         icon: "💬",
        //         title: "Commented on Ramen Kuroda Greenhills",
        //         date: "Feb 02, 2026",
        //         content: "The broth is super rich! I'd suggest going for the tamago add-on, it's worth it."
        //     },
        //     {
        //         icon: "✍️",
        //         title: "Reviewed Mendokoro Ramenba",
        //         date: "Jan 30, 2026",
        //         rating: 4.8,
        //         stars: "⭐⭐⭐⭐⭐",
        //         reviewTitle: "Tonkotsu Heaven",
        //         content: "I've tried a lot of ramen spots around the metro..."
        //     }
        // ]
    });
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