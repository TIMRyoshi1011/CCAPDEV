import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import 'dotenv/config';
import { connectToMongo, getDb } from "./db/conn.js";

const app = express();
const port = 3000;
app.use(bodyParser.json());
app.use(cors());

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

// server activation
app.listen(port, () => {
    console.log(`Server runinng at http://localhost:${port}`);

});
