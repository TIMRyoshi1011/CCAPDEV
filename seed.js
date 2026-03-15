import { MongoClient } from "mongodb";

// Connection URL
const url = "mongodb://adminUser:adminUserPassword@ac-tcyvp62-shard-00-00.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-01.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-02.ccrzj8t.mongodb.net:27017/?ssl=true&replicaSet=atlas-10gktb-shard-0&authSource=admin&appName=Cluster0";
const client = new MongoClient(url);
const dbName = "forum";

async function main() {
    try {
        await client.connect();
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        const usersCollection = db.collection("profile");
        const postsCollection = db.collection("posts");
        const votesCollection = db.collection("votes");

        await usersCollection.deleteMany({});
        await postsCollection.deleteMany({});
        await votesCollection.deleteMany({});
        console.log("Checking and preserving existing data...");

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

        let usersInserted = 0;
        for (const userData of usersData) {
            const existingUser = await usersCollection.findOne({ username: userData.username });
            if (!existingUser) {
                await usersCollection.insertOne(userData);
                usersInserted++;
            }
        }
        console.log(`${usersInserted} users inserted (skipped ${usersData.length - usersInserted} existing)`);

        const users = await usersCollection.find().toArray();
        const userMap = {};
        users.forEach(u => userMap[u.username] = u);

        const createComment = (user, text) => ({
            currentUser: {
                name: user.name,
                avatar: user.avatar,
                rankClass: user.rankClass,
                initials: user.avatar,
                email: user.email
            },
            text: text,
            date: new Date().toLocaleDateString()
        });

        const postsData = [
            {
                currentUser: userMap['lance_chua'],
                restaurant: "Jollibee",
                cuisine: "Filipino",
                location: "Quezon City",
                title: "Classic Chickenjoy Never Fails",
                content: "Went here after a long day. The Chickenjoy combo is still the standard — crispy skin, juicy meat, and that iconic gravy. Sides were fresh. Staff was friendly too.",
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
                currentUser: userMap['mia_santos'],
                restaurant: "Yabu",
                cuisine: "Japanese",
                location: "Makati",
                title: "Best Katsu in Town",
                content: "I've tried a LOT of Katsu restaurants here and this one takes the cake. The pork is insanely tender and the cabbage is unlimited. Service is top notch.",
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

        let postsInserted = 0;
        for (const postData of postsData) {
            const existingPost = await postsCollection.findOne({
                title: postData.title,
                "currentUser.username": postData.currentUser.username
            });

            if (!existingPost) {
                await postsCollection.insertOne(postData);
                postsInserted++;
            }
        }
        console.log(`${postsInserted} posts inserted (skipped ${postsData.length - postsInserted} existing)`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
        console.log("Connection closed");
    }
}

main();