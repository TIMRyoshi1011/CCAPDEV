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

        // Clear existing data is commented out to preserve data
        // await usersCollection.deleteMany({});
        // await postsCollection.deleteMany({});
        console.log("Checking and preserving existing data...");

        // --- 1. Create Users ---
const usersData = [
            {
                name: "Lance Chua",
                username: "lance_chua",
                email: "lance@example.com",
                password: "password123",
                avatar: "LC",
                badge: "🏆 Gold",
                membership: "Gold",
                memberSince: "January 15, 2024",
                tier: "Gold",
                tierIcon: "🏆",
                points: 1200,
                nextTier: "Platinum",
                verified: true,
                bio: "Food enthusiast exploring Metro Manila.",
                rankClass: "gold",
                totalReviews: 2,
                topCuisine: "Filipino",
                avgRating: 4.5,
                locations: 3,
                topRated: "Jollibee",
                comments: 1,
                upvotes: 20,
                downvotes: 1
            },
            {
                name: "Mia Santos",
                username: "mia_santos",
                email: "mia@example.com",
                password: "password123",
                avatar: "MS",
                badge: "💎 Platinum",
                membership: "Platinum",
                memberSince: "March 10, 2023",
                tier: "Platinum",
                tierIcon: "💎",
                points: 2500,
                nextTier: "Diamond",
                verified: true,
                bio: "Curator of fine dining experiences.",
                rankClass: "platinum",
                totalReviews: 5,
                topCuisine: "Japanese",
                avgRating: 4.8,
                locations: 8,
                topRated: "Yabu",
                comments: 1,  
                upvotes: 50,
                downvotes: 0
            },
            {
                name: "Rina Reyes",
                username: "rina_reyes",
                email: "rina@example.com",
                password: "password123",
                avatar: "RR",
                badge: "🥈 Silver",
                membership: "Silver",
                memberSince: "July 22, 2024",
                tier: "Silver",
                tierIcon: "🥈",
                points: 500,
                nextTier: "Gold",
                verified: true,
                bio: "Always hungry for ramen.",
                rankClass: "silver",
                totalReviews: 3,
                topCuisine: "Japanese",
                avgRating: 4.0,
                locations: 4,
                topRated: "Illo",
                comments: 1,  
                upvotes: 10,
                downvotes: 2
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
                points: 100,
                nextTier: "Silver",
                verified: false,
                bio: "New to the city!",
                rankClass: "bronze",
                totalReviews: 1,
                topCuisine: "Filipino",
                avgRating: 3.5,
                locations: 1,
                topRated: "Sisig Hooray",
                comments: 1,  
                upvotes: 5,
                downvotes: 0
            },
            {
                name: "Justine Valdes",
                username: "justine_valdes",
                email: "justinevaldes05@gmail.com",
                password: "123123",
                avatar: "JV",
                badge: "🏆 Gold",
                membership: "Gold",
                memberSince: "February 14, 2024",
                tier: "Gold",
                tierIcon: "🏆",
                points: 1500,
                nextTier: "Platinum",
                verified: true,
                bio: "Dessert lover.",
                rankClass: "gold",
                totalReviews: 4,
                topCuisine: "Italian",
                avgRating: 4.7,
                locations: 5,
                topRated: "Gino's Brick Oven Pizza",
                comments: 0, 
                upvotes: 30,
                downvotes: 1
            },
            {
                name: "Bea Alonzo",
                username: "bea_alonzo",
                email: "bea@example.com",
                password: "password123",
                avatar: "BA",
                badge: "🏆 Gold",
                membership: "Gold",
                memberSince: "February 14, 2024",
                tier: "Gold",
                tierIcon: "🏆",
                points: 1500,
                nextTier: "Platinum",
                verified: true,
                bio: "Dessert lover.",
                rankClass: "gold",
                totalReviews: 4,
                topCuisine: "Italian",
                avgRating: 4.7,
                locations: 5,
                topRated: "Gino's Brick Oven Pizza",
                comments: 1,  
                upvotes: 30,
                downvotes: 1
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

        // Get users back to use in posts (need _id and structure)
        const users = await usersCollection.find().toArray();
        const userMap = {};
        users.forEach(u => userMap[u.username] = u);

        // Helper to create comment object
        const createComment = (user, text) => ({
            currentUser: {
                name: user.name,
                avatar: user.avatar,
                rankClass: user.rankClass,
                initials: user.avatar 
            },
            text: text,
            date: new Date().toLocaleDateString()
        });

        // --- 2. Create Posts ---
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
                likes: 15,
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
                likes: 42,
                dislikes: 0,
                comments: [
                    createComment(userMap['rina_reyes'], "The miso soup is great too.")
                ]
            },
            {
                currentUser: userMap['rina_reyes'],
                restaurant: "Illo",
                cuisine: "Japanese",
                location: "BGC",
                title: "Decent but Overhyped",
                content: "The sukiyaki pot was tasty enough, sure. But the portions felt small for the price and the wait time was almost an hour on a Tuesday.",
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐⭐⭐",
                ratingValue: 3.0,
                ownPost: true,
                tags: [],
                scores: { service: 3.0, taste: 4.0, ambiance: 5.0 },
                likes: 8,
                dislikes: 1,
                comments: [
                    createComment(userMap['bea_alonzo'], "Oh no, I was planning to go there. Thanks for the heads up!")
                ]
            },
            {
                currentUser: userMap['carlo_dc'],
                restaurant: "Chef Bab's Sisig",
                cuisine: "Filipino",
                location: "Quezon City",
                title: "Good Sisig",
                content: "Solid sisig for the price. Not the best I've had but definitely hits the spot.",
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐⭐⭐",
                ratingValue: 3.5,
                ownPost: true,
                tags: [],
                scores: { service: 3.0, taste: 4.0, ambiance: 2.0 },
                likes: 3,
                dislikes: 0,
                comments: []
            },
            {
                currentUser: userMap['bea_alonzo'],
                restaurant: "Gino's Brick Oven Pizza",
                cuisine: "Italian",
                location: "Taguig",
                title: "Chocolate Pizza!",
                content: "You have to try the chocolate pizza for dessert. It's surprisingly good with the sea salt.",
                date: new Date().toLocaleDateString(),
                ratingStars: "⭐⭐⭐⭐⭐",
                ratingValue: 4.8,
                ownPost: true,
                tags: [],
                scores: { service: 4.5, taste: 5.0, ambiance: 4.0 },
                likes: 25,
                dislikes: 0,
                comments: [
                    createComment(userMap['lance_chua'], "Adding this to my list!")
                ]
            }
        ];

        let postsInserted = 0;
        for (const postData of postsData) {
            // Check if post exists by title and author
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
        
        // Comments are now included directly in the post data above.
        
        // --- 4. Update User Stats Based on Posts ---
        console.log("Updating user stats...");
        
        // Refresh users list cause we need to iterate all of them
        const allUsers = await usersCollection.find().toArray();

        for (const user of allUsers) {
             const userPosts = await postsCollection.find({ "currentUser.email": user.email }).toArray();
             
             if (userPosts.length > 0) {
                 const totalReviews = userPosts.length;
                 
                 // Avg Rating
                 const totalRating = userPosts.reduce((acc, p) => acc + parseFloat(p.ratingValue || 0), 0);
                 const avgRating = parseFloat((totalRating / totalReviews).toFixed(1));

                 // Locations
                 const uniqueLocations = new Set(userPosts.map(p => p.location).filter(l => l)).size;

                 // Top Cuisine
                  const cuisineCounts = {};
                  let topCuisine = "None";
                  userPosts.forEach(post => {
                      const c = post.cuisine;
                      if (c) cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
                  });
                  if (Object.keys(cuisineCounts).length > 0) {
                      topCuisine = Object.keys(cuisineCounts).reduce((a, b) => cuisineCounts[a] > cuisineCounts[b] ? a : b);
                  }

                 // Top Rated
                 const topRatedPost = userPosts.reduce((prev, current) => (parseFloat(prev.ratingValue || 0) > parseFloat(current.ratingValue || 0)) ? prev : current);
                 const topRated = topRatedPost.restaurant || "None";
                 
                 // Update User
                 await usersCollection.updateOne(
                     { _id: user._id },
                     { $set: { 
                         totalReviews, 
                         avgRating, 
                         locations: uniqueLocations, 
                         topCuisine, 
                         topRated 
                     }}
                 );
                 console.log(`Updated stats for ${user.username}`);
             } else {
                 // Reset stats if no posts found
                 await usersCollection.updateOne(
                     { _id: user._id },
                     { $set: { 
                         totalReviews: 0, 
                         avgRating: 0, 
                         locations: 0, 
                         topCuisine: "None", 
                         topRated: "None" 
                     }}
                 );
             }
        }

        console.log("Seed complete with stat updates!");

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
        console.log("Connection closed");
    }
}

main();