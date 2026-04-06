import mongoose from "mongoose";
import bcrypt from "bcrypt";
import connectToMongoose from "./db/conn.js";
import Profile from "./models/Profile.js";
import Post from "./models/Post.js";
import Vote from "./models/Vote.js";

const POINT_RULES = {
    WRITE_REVIEW: 10,
    RECEIVE_UPVOTE: 2,
    RECEIVE_DOWNVOTE: -1,
    RECEIVE_COMMENT: 1
};

function initialsFromName(name) {
    return (name || "")
        .split(" ")
        .filter(Boolean)
        .map(word => word[0].toUpperCase())
        .join("") || "US";
}

function starsFromRating(ratingValue) {
    return "⭐".repeat(Math.max(1, Math.round(Number(ratingValue) || 0)));
}

function toDate(value) {
    if (!value) return new Date();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}

function getTierInfo(points) {
    if (points >= 1000) {
        return {
            tier: "Master",
            tierIcon: "🏆",
            badge: "🏆 Master",
            nextTier: "Max Tier",
            verified: true,
            rankClass: "master"
        };
    }
    if (points >= 500) {
        return {
            tier: "Diamond",
            tierIcon: "💍",
            badge: "💍 Diamond",
            nextTier: "Master",
            verified: true,
            rankClass: "diamond"
        };
    }
    if (points >= 300) {
        return {
            tier: "Platinum",
            tierIcon: "💎",
            badge: "💎 Platinum",
            nextTier: "Diamond",
            verified: true,
            rankClass: "platinum"
        };
    }
    if (points >= 150) {
        return {
            tier: "Gold",
            tierIcon: "🥇",
            badge: "🥇 Gold",
            nextTier: "Platinum",
            verified: true,
            rankClass: "gold"
        };
    }
    if (points >= 50) {
        return {
            tier: "Silver",
            tierIcon: "🥈",
            badge: "🥈 Silver",
            nextTier: "Gold",
            verified: true,
            rankClass: "silver"
        };
    }

    return {
        tier: "Bronze",
        tierIcon: "🥉",
        badge: "🥉 Bronze",
        nextTier: "Silver",
        verified: false,
        rankClass: "bronze"
    };
}

const usersData = [
    {
        name: "Lance Chua",
        username: "lance_chua",
        email: "lance@example.com",
        //  password=password123, securityAnswer=chickenjoy
        password: "password123",
        securityQuestion: "What is your favorite food?",
        securityAnswer: "chickenjoy",
        memberSince: "January 15, 2024",
        bio: "Food enthusiast exploring Metro Manila."
    },
    {
        name: "Mia Santos",
        username: "mia_santos",
        email: "mia@example.com",
        //  password=password123, securityAnswer=momo
        password: "password123",
        securityQuestion: "What is your first pet's name?",
        securityAnswer: "momo",
        memberSince: "March 10, 2023",
        bio: "Curator of fine dining experiences."
    },
    {
        name: "Rina Reyes",
        username: "rina_reyes",
        email: "rina@example.com",
        //  password=password123, securityAnswer=manila
        password: "password123",
        securityQuestion: "What city were you born in?",
        securityAnswer: "manila",
        memberSince: "July 22, 2024",
        bio: "Always hungry for ramen."
    },
    {
        name: "Carlo Dela Cruz",
        username: "carlo_dc",
        email: "carlo@example.com",
        //  password=password123, securityAnswer=inception
        password: "password123",
        securityQuestion: "What is your favorite movie?",
        securityAnswer: "inception",
        memberSince: "January 5, 2025",
        bio: "New to the city!"
    },
    {
        name: "Jamie Valdes",
        username: "jamie_valdes",
        email: "justine030505@gmail.com",
        //  password=123123, securityAnswer=chiten
        password: "123123",
        securityQuestion: "What is your favorite food?",
        securityAnswer: "chiten",
        memberSince: "February 14, 2024",
        bio: "Dessert lover."
    },
    {
        name: "Bea Alonzo",
        username: "bea_alonzo",
        email: "bea@example.com",
        //  password=password123, securityAnswer=beebee
        password: "password123",
        securityQuestion: "What was your childhood nickname?",
        securityAnswer: "beebee",
        memberSince: "February 14, 2024",
        bio: "Dessert lover."
    }
];

const postsData = [
    {
        authorUsername: "lance_chua",
        restaurant: "Jollibee",
        cuisine: "Filipino",
        location: "Quezon City",
        title: "Classic Chickenjoy Never Fails",
        content: "Went here after a long day. The Chickenjoy combo is still the standard - crispy skin, juicy meat, and that iconic gravy. Sides were fresh. Staff was friendly too.",
        date: new Date(),
        ratingValue: 4.0,
        scores: { service: 4.0, taste: 5.0, ambiance: 3.0 },
        likes: 4,
        dislikes: 1,
        comments: [
            { username: "mia_santos", text: "Totally agree about the gravy!" },
            { username: "carlo_dc", text: "Best fast food chicken hands down." }
        ]
    },
    {
        authorUsername: "mia_santos",
        restaurant: "Yabu",
        cuisine: "Japanese",
        location: "Makati",
        title: "Best Katsu in Town",
        content: "I've tried a lot of Katsu restaurants here and this one takes the cake. The pork is insanely tender and the cabbage is unlimited. Service is top notch.",
        date: new Date(),
        ratingValue: 5.0,
        scores: { service: 5.0, taste: 5.0, ambiance: 4.5 },
        likes: 5,
        dislikes: 0,
        comments: [
            { username: "rina_reyes", text: "The miso soup is great too." }
        ]
    },
    {
        authorUsername: "rina_reyes",
        restaurant: "Illo",
        cuisine: "Japanese",
        location: "BGC",
        title: "Decent but Overhyped",
        content: "The sukiyaki pot was tasty enough, sure. But the portions felt small for the price and the wait time was almost an hour on a Tuesday.",
        date: new Date(),
        ratingValue: 3.0,
        scores: { service: 3.0, taste: 4.0, ambiance: 5.0 },
        likes: 2,
        dislikes: 1,
        comments: [
            { username: "bea_alonzo", text: "Oh no, I was planning to go there. Thanks for the heads up!" }
        ]
    },
    {
        authorUsername: "carlo_dc",
        restaurant: "Chef Bab's Sisig",
        cuisine: "Filipino",
        location: "Quezon City",
        title: "Good Sisig",
        content: "Solid sisig for the price. Not the best I've had but definitely hits the spot.",
        date: new Date(),
        ratingValue: 3.5,
        scores: { service: 3.0, taste: 4.0, ambiance: 2.0 },
        likes: 1,
        dislikes: 0,
        comments: []
    },
    {
        authorUsername: "bea_alonzo",
        restaurant: "Gino's Brick Oven Pizza",
        cuisine: "Italian",
        location: "Taguig",
        title: "Chocolate Pizza!",
        content: "You have to try the chocolate pizza for dessert. It's surprisingly good with the sea salt.",
        date: new Date(),
        ratingValue: 4.8,
        scores: { service: 4.5, taste: 5.0, ambiance: 4.0 },
        likes: 3,
        dislikes: 0,
        comments: [
            { username: "lance_chua", text: "Adding this to my list!" }
        ]
    },
    {
        authorUsername: "jamie_valdes",
        restaurant: "Mcdonalds",
        cuisine: "American",
        location: "Pasig",
        title: "Bad!",
        content: "Super stale fries :( Nuggets taste reheated. Please do better!",
        date: "March 15, 2026",
        ratingValue: 2.7,
        scores: { service: 4.0, taste: 1.0, ambiance: 3.0 },
        likes: 0,
        dislikes: 0,
        comments: []
    },
    {
        authorUsername: "jamie_valdes",
        restaurant: "La Toca Taqueria",
        cuisine: "Mexican",
        location: "Quezon City",
        title: "Birria cravings satisfied!",
        content: "Authentic tacos! The birria is a must-try. Consome was flavorful.",
        date: "February 20, 2026",
        ratingValue: 4.5,
        scores: { service: 4.5, taste: 5.0, ambiance: 4.0 },
        likes: 1,
        dislikes: 0,
        comments: []
    },
    {
        authorUsername: "jamie_valdes",
        restaurant: "The Barn",
        cuisine: "American",
        location: "Taguig",
        title: "Cozy vibes",
        content: "Cozy place, good coffee, but the pasta was a bit salty for my taste.",
        date: "January 15, 2026",
        ratingValue: 3.8,
        scores: { service: 4.0, taste: 3.5, ambiance: 4.0 },
        likes: 1,
        dislikes: 0,
        comments: []
    },
    {
        authorUsername: "jamie_valdes",
        restaurant: "Rica's Bacsilog",
        cuisine: "Filipino",
        location: "Quezon City",
        title: "Classic comfort food",
        content: "The cheese sauce never fails. Cheap and filling.",
        date: "March 10, 2026",
        ratingValue: 4.0,
        scores: { service: 3.0, taste: 5.0, ambiance: 2.0 },
        likes: 2,
        dislikes: 0,
        comments: []
    }
];

async function seedUsers() {
    const payload = [];

    for (const seedUser of usersData) {
        const hashedPassword = await bcrypt.hash(seedUser.password, 10);
        const hashedSecurityAnswer = await bcrypt.hash(seedUser.securityAnswer, 10);

        payload.push({
            name: seedUser.name,
            username: seedUser.username,
            email: seedUser.email,
            password: hashedPassword,
            securityQuestion: seedUser.securityQuestion,
            securityAnswer: hashedSecurityAnswer,
            avatar: initialsFromName(seedUser.name),
            membership: "Bronze",
            memberSince: seedUser.memberSince,
            bio: seedUser.bio
        });
    }

    const users = await Profile.insertMany(payload);
    console.log(`${users.length} users inserted`);
    return users;
}

async function seedPosts(userMap) {
    const seededPosts = [];

    for (const seedPost of postsData) {
        const author = userMap[seedPost.authorUsername];
        if (!author) {
            console.warn(`Skipping post '${seedPost.title}' because user '${seedPost.authorUsername}' was not found`);
            continue;
        }

        const comments = seedPost.comments
            .map(comment => {
                const commenter = userMap[comment.username];
                if (!commenter) return null;
                return {
                    currentUser: commenter._id,
                    text: comment.text,
                    date: new Date()
                };
            })
            .filter(Boolean);

        const payload = {
            currentUser: author._id,
            restaurant: seedPost.restaurant,
            cuisine: seedPost.cuisine,
            location: seedPost.location,
            title: seedPost.title,
            content: seedPost.content,
            date: toDate(seedPost.date),
            ratingStars: starsFromRating(seedPost.ratingValue),
            ratingValue: Number(seedPost.ratingValue),
            ownPost: true,
            tags: [],
            scores: {
                service: Number(seedPost.scores.service),
                taste: Number(seedPost.scores.taste),
                ambiance: Number(seedPost.scores.ambiance)
            },
            likes: Number(seedPost.likes || 0),
            dislikes: Number(seedPost.dislikes || 0),
            comments,
            userVotes: {}
        };

        const postDoc = await Post.create(payload);

        seededPosts.push(postDoc);
    }

    console.log(`${seededPosts.length} posts inserted`);
    return seededPosts;
}

async function seedVotes(seededPosts, users) {
    for (const post of seededPosts) {
        const voters = users.filter(user => String(user._id) !== String(post.currentUser));
        const desiredVotes = [];

        let cursor = 0;
        const upvoteTarget = Number(post.likes || 0);
        const downvoteTarget = Number(post.dislikes || 0);

        for (let i = 0; i < upvoteTarget && cursor < voters.length; i += 1) {
            const voter = voters[cursor];
            cursor += 1;
            desiredVotes.push({
                postId: post._id,
                userId: voter._id,
                userEmail: voter.email,
                type: "upvote",
                date: new Date()
            });
        }

        for (let i = 0; i < downvoteTarget && cursor < voters.length; i += 1) {
            const voter = voters[cursor];
            cursor += 1;
            desiredVotes.push({
                postId: post._id,
                userId: voter._id,
                userEmail: voter.email,
                type: "downvote",
                date: new Date()
            });
        }

        await Vote.deleteMany({ postId: post._id });

        if (desiredVotes.length > 0) {
            await Vote.insertMany(desiredVotes, { ordered: false });
        }

        // Keep userVotes empty in seed data because Mongoose Map keys cannot contain dots,
        // while email addresses do. Runtime vote operations will repopulate this.
        await Post.updateOne({ _id: post._id }, { $set: { userVotes: {} } });
    }

    console.log("Votes and userVotes maps seeded");
}

async function recomputeUserStats(users) {
    const allPosts = await Post.find({}).lean();

    for (const user of users) {
        const userPosts = allPosts.filter(post => String(post.currentUser) === String(user._id));

        const totalReviews = userPosts.length;
        const totalRating = userPosts.reduce((sum, post) => sum + Number(post.ratingValue || 0), 0);
        const avgRating = totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(1)) : 0;

        const cuisineCounts = {};
        const locationSet = new Set();
        for (const post of userPosts) {
            if (post.cuisine) cuisineCounts[post.cuisine] = (cuisineCounts[post.cuisine] || 0) + 1;
            if (post.location) locationSet.add(post.location);
        }

        const topCuisine = Object.keys(cuisineCounts).length > 0
            ? Object.keys(cuisineCounts).reduce((a, b) => cuisineCounts[a] > cuisineCounts[b] ? a : b)
            : "None";

        const topRated = totalReviews > 0
            ? userPosts.reduce((a, b) => Number(a.ratingValue || 0) > Number(b.ratingValue || 0) ? a : b).restaurant
            : "None";

        const commentsMade = allPosts.reduce((sum, post) => {
            const count = (post.comments || []).filter(comment => String(comment.currentUser) === String(user._id)).length;
            return sum + count;
        }, 0);

        const upvotesReceived = userPosts.reduce((sum, post) => sum + Number(post.likes || 0), 0);
        const downvotesReceived = userPosts.reduce((sum, post) => sum + Number(post.dislikes || 0), 0);
        const commentsReceived = userPosts.reduce((sum, post) => sum + (post.comments || []).length, 0);

        const points =
            (totalReviews * POINT_RULES.WRITE_REVIEW) +
            (upvotesReceived * POINT_RULES.RECEIVE_UPVOTE) +
            (downvotesReceived * POINT_RULES.RECEIVE_DOWNVOTE) +
            (commentsReceived * POINT_RULES.RECEIVE_COMMENT);

        const tierInfo = getTierInfo(points);

        await Profile.updateOne(
            { _id: user._id },
            {
                $set: {
                    avatar: initialsFromName(user.name),
                    totalReviews,
                    avgRating,
                    locations: locationSet.size,
                    topCuisine,
                    topRated,
                    comments: commentsMade,
                    upvotes: upvotesReceived,
                    downvotes: downvotesReceived,
                    points,
                    ...tierInfo
                }
            }
        );
    }

    console.log("User stats/points/tier recomputed");
}

async function resetDatabase() {
    await Promise.all([
        Vote.deleteMany({}),
        Post.deleteMany({}),
        Profile.deleteMany({})
    ]);
    console.log("Existing profiles, posts, and votes removed");
}

async function main() {
    try {
        await connectToMongoose();
        await resetDatabase();

        const users = await seedUsers();
        const userMap = {};
        for (const user of users) {
            userMap[user.username] = user;
        }

        const seededPosts = await seedPosts(userMap);
        await seedVotes(seededPosts, users);
        await recomputeUserStats(users);

        console.log("Seed complete");
    } catch (err) {
        console.error("Seed error:", err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("Connection closed");
    }
}

main();