import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import exphbs from "express-handlebars";
// import 'dotenv/config';
// import { connectToMongo, getDb } from "./db/conn.js";

const app = express();
const port = 3000;
const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// handlebars
let posts = [];

let cuisines = ["Filipino", "Korean", "Indian", "Japanese"];
let locations = ["BGC", "Makati", "Quezon City", "Taguig"];
let sortOptions = ["Recent", "Top Rated", "Most Commented"];

let user = {
            name: "Marcus Ramos",  
            username: "marcus_ramos",
            avatar: "MR",      
            badge: "🥉 Bronze",   
            membership: "Bronze",
            memberSince: "March 2026",
            tier: "Bronze",
            tierIcon: "🥉",
            points: 0,
            nextTier: "N/A",
            verified: false,
            bio: "Bio",
            rankClass: "bronze"
        };

let stats = {
            totalReviews: 0,        // default values
            topCuisine: 'None',  
            avgRating: 0,      
            locations: 0,        
            topRated: 'None',       
            comments: 0,
            points: 0,
            upvotes: 0,
            downvotes: 0,
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
// connectToMongo((err) => {
//     if(err) {
//         console.log("error occurred");
//         console.error(err);
//         process.exit();
//     }
//     console.log("Connected to MongoDB server");
// });

// After login, redirect to feed
app.get("/feed", (req, res) => {
    res.render("feed", {
        cuisines,
        locations,
        sortOptions,
        pageTitle: "Feed",
        activePage: "feed",
        user,
        stats,
        notifications: 0,
        posts
    });
});

// writing a review
app.get("/write-review", (req, res) => {
    res.render("write-review", {
        pageTitle: "Write Review",
        user
    });
});

// posting the review
app.post('/write-review', (req, res) => {
    const { restaurant, content, foodRating, serviceRating } = req.body;

    if (content && content.trim() !== '') {
        const newPost = {
            restaurant,
            title: `${restaurant} Review`,
            content,
            date: new Date().toLocaleDateString(),
            ratingStars: "⭐".repeat(foodRating),
            ratingValue: foodRating,
            user,
            ownPost: true,
            tags: [],
            scores: { service: serviceRating, taste: foodRating, ambiance: 5 },
            likes: 0,
            dislikes: 0,
            comments: []
        };
        posts.unshift(newPost);
        stats.totalReviews = posts.length;
    }

    res.redirect('/feed');
});

// Notifications
app.get('/notifications', (req, res) => {
    res.render("notifications", {
        pageTitle: "Notifications",
        activePage: "notifs",
        user,
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
        user, 
        stats
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
        user, 
        stats
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
    user, 
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