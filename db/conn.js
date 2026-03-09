import { MongoClient } from "mongodb";

// const mongo_URI = "mongo_db://localhost:27017";
const mongo_URI = process.env.MONGODB_URL;
const client = new MongoClient(mongo_URI);

// if (!MONGO_URI) {
//     throw new Error("MONGO_URI missing in .env file");
// }

export function connectToMongo(callback) {
    client.connect().then( (client) => {
        return callback();
    }).catch(err => {
        callback(err);
    });
}

export function getDb(dbName = process.env.DB_NAME) {
    return client.db(dbName);
}

function signalHandler() {
    console.log("Closing MongoDB connection...");
    client.close();
    process.exit();
}

process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
process.on('SIGQUIT', signalHandler);