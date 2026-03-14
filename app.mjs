import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
import { connectToMongo, getDb } from "./db/conn.js";

const app = express();
const port = 3000;
const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

let cuisines = ["Filipino", "Korean", "Indian", "Japanese"];
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
        eq: (a, b) => a === b
    },
    layoutsDir: path.join(__dirname, "views/layouts")
}));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static('public')); // launches the html files

app.get('/', (req, res) => {
    res.sendFile(path.resolve('public/Landing.html')); // make Landing.html default
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

// After login, redirect to feed
app.get("/feed", async (req, res) => {
    try {
        const db = getDb(); 
        const allPosts = db.collection("posts");

        posts = await allPosts.find({}).toArray();

        res.render("feed", {
            cuisines,
            locations,
            sortOptions,
            pageTitle: "Feed",
            activePage: "feed",
            currentUser,
            notifications: 0,
            posts
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
        currentUser
    });
});

// posting the review
app.post('/write-review', async (req, res) => {
    try {
        const db = getDb();
        const users = db.collection("profile");
        const uploadPost = db.collection("posts");
        const { restaurant, content, foodRating, serviceRating } = req.body;

        if (content && content.trim() !== '') {
            const newPost = {
                currentUser,
                restaurant,
                title: `${restaurant} Review`,
                content,
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐".repeat(foodRating),
                ratingValue: foodRating,
                ownPost: true,
                tags: [],
                scores: { service: serviceRating, taste: foodRating, ambiance: 5 }, // papalitan nalang ng ambiance
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
        res.redirect('/feed');
    } catch (err) {
        console.error("Error writing review:", err);
        return res.status(500).json({ message: "Server error." });
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
app.get('/userprofile-reviews', (req, res) => {
    res.render("userprofile-reviews", {
        pageTitle: "Profile-Reviews",
        activePage: "profile",
        currentUser
        // reviews: [
        //     {
        //     restaurant: "Yabu",
        //     cuisine: "Indian",
        //     location: "Makati",
        //     rating: 4.7,
        //     title: "Best Butter Chicken in Manila",
        //     content: "I've tried a LOT of Indian restaurants...",
        //     date: "Jan 26, 2026",
        //     service: "★★★★★",
        //     taste: "★★★★★",
        //     ambiance: "★★★★☆",
        //     comments: 2,
        //     ownPost: true
        //     },

        //     {
        //     restaurant: "Kodawari",
        //     cuisine: "Japanese",
        //     location: "BGC",
        //     rating: 5.0,
        //     title: "Gyudon so bomb",
        //     content: "The Japanese Gyudon here is genuinely one of the best...",
        //     date: "Jan 20, 2026",
        //     service: "★★★★★",
        //     taste: "★★★★★",
        //     ambiance: "★★★★★",
        //     comments: 2,
        //     ownPost: true
        //     }
        // ]
    });
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
    console.log(`Server runinng at http://localhost:${port}`);
});