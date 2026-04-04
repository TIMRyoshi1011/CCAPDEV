import mongoose from "mongoose";
import Profile from "./models/Profile.js";
import Post from "./models/Post.js";
import Vote from "./models/Vote.js";

const MONGO_URI = "mongodb://adminUser:adminUserPassword@ac-tcyvp62-shard-00-00.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-01.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-02.ccrzj8t.mongodb.net:27017/?ssl=true&replicaSet=atlas-10gktb-shard-0&authSource=admin&appName=Cluster0";

async function main() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB (Mongoose)");

        await Profile.deleteMany({});
        await Post.deleteMany({});
        await Vote.deleteMany({});
        console.log("Database cleared");

        const usersData = [
            {
                name: "Lance Chua",
                username: "lance_chua",
                email: "lance@example.com",
                password: "password123",
                avatar: "LC",
                badge: "🥉 Bronze",
                membership: "Bronze",
                memberSince: "January 15, 2024",
                tier: "Bronze",
                tierIcon: "🥉",
                points: 23,
                nextTier: "Silver",
                verified: false,
                bio: "Food enthusiast exploring Metro Manila.",
                rankClass: "bronze",
                totalReviews: 1,
                topCuisine: "Filipino",
                avgRating: 4.0,
                locations: 1,
                topRated: "Jollibee",
                comments: 1,
                upvotes: 2,
                downvotes: 0
            },
            {
                name: "Mia Santos",
                username: "mia_santos",
                email: "mia@example.com",
                password: "password123",
                avatar: "MS",
                badge: "🥉 Bronze",
                membership: "Bronze",
                memberSince: "March 10, 2023",
                tier: "Bronze",
                tierIcon: "🥉",
                points: 24,
                nextTier: "Silver",
                verified: false,
                bio: "Curator of fine dining experiences.",
                rankClass: "bronze",
                totalReviews: 1,
                topCuisine: "Japanese",
                avgRating: 5.0,
                locations: 1,
                topRated: "Yabu",
                comments: 1,
                upvotes: 3,
                downvotes: 0
            },
            {
                name: "Rina Reyes",
                username: "rina_reyes",
                email: "rina@example.com",
                password: "password123",
                avatar: "RR",
                badge: "🥉 Bronze",
                membership: "Bronze",
                memberSince: "July 22, 2024",
                tier: "Bronze",
                tierIcon: "🥉",
                points: 17,
                nextTier: "Silver",
                verified: false,
                bio: "Always hungry for ramen.",
                rankClass: "bronze",
                totalReviews: 1,
                topCuisine: "Japanese",
                avgRating: 3.0,
                locations: 1,
                topRated: "Illo",
                comments: 1,
                upvotes: 1,
                downvotes: 0
            },
            {
                name: "Carlo Dela Cruz",
                username: "carlo_dc",
                email: "carlo@example.com",
                password: "password123",
                avatar: "CD",
                badge: "🥉 Bronze",
                membership: "Bronze",
                memberSince: "January 5, 2025",
                tier: "Bronze",
                tierIcon: "🥉",
                points: 14,
                nextTier: "Silver",
                verified: false,
                bio: "New to the city!",
                rankClass: "bronze",
                totalReviews: 1,
                topCuisine: "Filipino",
                avgRating: 3.5,
                locations: 1,
                topRated: "Chef Bab's Sisig",
                comments: 1,
                upvotes: 0,
                downvotes: 0
            },
            {
                name: "Justine Valdes",
                username: "justine_valdes",
                email: "justinevaldes05@gmail.com",
                password: "123123",
                avatar: "JV",
                badge: "🥉 Bronze",
                membership: "Bronze",
                memberSince: "February 14, 2024",
                tier: "Bronze",
                tierIcon: "🥉",
                points: 48,
                nextTier: "Silver",
                verified: false,
                bio: "Dessert lover.",
                rankClass: "bronze",
                totalReviews: 4,
                topCuisine: "American",
                avgRating: 3.8,
                locations: 3,
                topRated: "La Toca Taqueria",
                comments: 0,
                upvotes: 0,
                downvotes: 0
            },
            {
                name: "Bea Alonzo",
                username: "bea_alonzo",
                email: "bea@example.com",
                password: "password123",
                avatar: "BA",
                badge: "🥉 Bronze",
                membership: "Bronze",
                memberSince: "February 14, 2024",
                tier: "Bronze",
                tierIcon: "🥉",
                points: 20,
                nextTier: "Silver",
                verified: false,
                bio: "Dessert lover.",
                rankClass: "bronze",
                totalReviews: 1,
                topCuisine: "Italian",
                avgRating: 4.8,
                locations: 1,
                topRated: "Gino's Brick Oven Pizza",
                comments: 1,
                upvotes: 2,
                downvotes: 0
            }
        ];

        const users = await Profile.insertMany(usersData);
        console.log(`${users.length} users inserted`);

        const userMap = {};
        users.forEach(u => userMap[u.username] = u);

        const createComment = (user, text) => ({
            currentUser: user._id,
            text,
            date: new Date().toLocaleDateString()
        });

        const postsData = [
            {
                currentUser: userMap['lance_chua']._id,
                restaurant: "Jollibee",
                cuisine: "Filipino",
                location: "Quezon City",
                title: "Classic Chickenjoy Never Fails",
                content: "Went here after a long day...",
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐⭐⭐⭐",
                ratingValue: 4.0,
                ownPost: true,
                tags: [],
                scores: { service: 4.0, taste: 5.0, ambiance: 3.0 },
                likes: 4,
                dislikes: 1,
                comments: [
                    createComment(userMap['mia_santos'], "Totally agree about the gravy!"),
                    createComment(userMap['carlo_dc'], "Best fast food chicken hands down.")
                ]
            },
            {
                currentUser: userMap['mia_santos']._id,
                restaurant: "Yabu",
                cuisine: "Japanese",
                location: "Makati",
                title: "Best Katsu in Town",
                content: "I've tried a LOT of Katsu restaurants...",
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐⭐⭐⭐⭐",
                ratingValue: 5.0,
                ownPost: true,
                tags: [],
                scores: { service: 5.0, taste: 5.0, ambiance: 4.5 },
                likes: 5,
                dislikes: 0,
                comments: [
                    createComment(userMap['rina_reyes'], "The miso soup is great too.")
                ]
            }
        ];

        const posts = await Post.insertMany(postsData);
        console.log(`${posts.length} posts inserted`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

main();