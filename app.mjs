import express from "express";
import path from "path";

const app = express();

const port = 3000;

app.use(express.static('public')); // launches the html files

app.get('/', (req, res) => {
    res.sendFile(path.resolve('public/Landing.html')); // make Landing.html default
});

// server activation
app.listen(port, () => {
    console.log(`Server runinng at http://localhost:${port}`);
});