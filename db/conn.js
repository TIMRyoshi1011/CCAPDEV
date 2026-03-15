// handle connection to the database (MongoDB)
import { MongoClient } from "mongodb";

const mongo_URI = "mongodb://adminUser:adminUserPassword@ac-tcyvp62-shard-00-00.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-01.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-02.ccrzj8t.mongodb.net:27017/?ssl=true&replicaSet=atlas-10gktb-shard-0&authSource=admin&appName=Cluster0"; // <-- change this from MongoDB atlas
const client = new MongoClient(mongo_URI);

export function connectToMongo(callback) {
    client.connect().then( (client) => {
        return callback();
    }).catch(err => {
        callback(err);
    });
}

export function getDb(dbName = "forum") {
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

