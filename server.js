// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000; // Use environment port or default to 3000



// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, 'login'))); // serve 'public' folder

// ---------------- MongoDB Setup ----------------
const uri = `mongodb+srv://${process.env.USERNM}:${process.env.PASS}@${process.env.HOST}/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let usersCollection;
let scoreCollection;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// ---------------- Passport GitHub Strategy ----------------
passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        // callbackURL: "http://localhost:3000/auth/github/callback"
        callbackURL: "http://localhost:3000/auth/github/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await usersCollection.findOne({ githubId: profile.id });

            if (!user) {
                // Save username + avatarUrl
                const newUser = {
                    githubId: profile.id,
                    username: profile.username,
                    avatarUrl: profile.photos[0].value // <-- HERE
                };

                const result = await usersCollection.insertOne(newUser);
                user = { ...newUser, _id: result.insertedId };
            } else {
                // Optional: update avatarUrl in case user changed it
                if (user.avatarUrl !== profile.photos[0].value) {
                    await usersCollection.updateOne(
                        { _id: user._id },
                        { $set: { avatarUrl: profile.photos[0].value } } // <-- HERE
                    );
                    user.avatarUrl = profile.photos[0].value;
                }
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// ---------------- Middleware to Protect Routes ----------------
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

// GitHub login
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub callback
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => res.redirect('/games')
);

// Example route
app.get('/', (req, res) => {
    // res.send('Hello from Express server!');
    res.sendFile(path.join(__dirname, 'login', 'login.html'));
});

app.use(express.static(path.join(__dirname, 'public'))); // serve 'public' folder

app.get('/games', ensureAuthenticated, (req, res) => {
    // res.send('Hello from Express server!');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.use(express.static(path.join(__dirname, 'public', 'games'))); // serve 'public' folder
app.get('/games/memorymatch', ensureAuthenticated, (req, res) => {
    // res.send('Hello from Express server!');
    res.sendFile(path.join(__dirname, 'public', 'games', 'memorymatch.html'));
});

app.get('/games/minesweeper', ensureAuthenticated, (req, res) => {
    // res.send('Hello from Express server!');
    res.sendFile(path.join(__dirname, 'public', 'games', 'minesweeper.html'));
});


app.get('/games/hangman', ensureAuthenticated, (req, res) => {
    // res.send('Hello from Express server!');
    res.sendFile(path.join(__dirname, 'public', 'games', 'hangman.html'));
});

app.get('/games/whackamole', ensureAuthenticated, (req, res) => {
    // res.send('Hello from Express server!');
    res.sendFile(path.join(__dirname, 'public', 'games', 'whackamole.html'));
});

// Example POST route
app.post('/data', (req, res) => {
    const data = req.body;
    res.json({ message: 'Data received', data });
});


async function run() {
    try {

        await client.connect();

        usersCollection = client.db("finalproject").collection("users");
        scoreCollection = client.db("finalproject").collection("finalproject");
        console.log("Connected to MongoDB!");

        // Endpoint to get the logged-in user's GitHub username
        app.get('/api/me', (req, res) => {
            if (req.isAuthenticated()) {
                res.json({
                    username: req.user.username,
                    avatarUrl: req.user.avatarUrl // make sure you save this in DB when user logs in
                });
            } else {
                res.status(401).json({ error: "Not logged in" });
            }
        });

        app.post('/api/memorymatch/score', async (req, res) => {
            try {
                const { username, moves, time, theme, game, date } = req.body;

                if (!username || !moves || !time || !theme || !game) {
                    return res.status(400).json({ error: "Missing fields" });
                }

                await scoreCollection.insertOne({ username, moves, time, theme, game, date });
                res.json({ success: true });
            } catch (err) {
                console.error("Error saving score:", err);
                res.status(500).json({ error: "Server error" });
            }
        });

        app.get('/api/memorymatch/data', async (req, res) => {
            try {
                const { username } = req.query;
                const query = { game: "MemoryMatch" };
                if (username) query.username = username;

                // Fetch top 100 scores sorted by moves (asc) then time (asc)
                const scores = await scoreCollection
                    .find(query)
                    .sort({ moves: 1, time: 1 })
                    .limit(100)
                    .toArray();
                res.json(scores);
            } catch (err) {
                console.error("Error fetching scores:", err);
                res.status(500).json({ error: "Server error" });
            }
        });
        app.post('/api/minesweeper/score', async (req, res) => {
            try {
                const { username, time, game, date } = req.body;

                if (!username || !time || !game) {
                    return res.status(400).json({ error: "Missing fields" });
                }

                await scoreCollection.insertOne({ username, time, game, date });
                res.json({ success: true });
            } catch (err) {
                console.error("Error saving score:", err);
                res.status(500).json({ error: "Server error" });
            }
        });

        app.get('/api/minesweeper/data', async (req, res) => {
            try {
                const { username } = req.query;
                const query = { game: "Minesweeper" };
                if (username) query.username = username;

                // Fetch top 100 scores sorted by time (asc)
                const scores = await scoreCollection
                    .find(query)
                    .sort({ time: 1 })
                    .limit(100)
                    .toArray();
                res.json(scores);
            } catch (err) {
                console.error("Error fetching scores:", err);
                res.status(500).json({ error: "Server error" });
            }
        });

        app.post('/api/hangman/score', async (req, res) => {
            try {
                const { username, score, game, date } = req.body;

                if (!username || !score || !game) {
                    return res.status(400).json({ error: "Missing fields" });
                }

                await scoreCollection.insertOne({ username, score, game, date });
                res.json({ success: true });
            } catch (err) {
                console.error("Error saving score:", err);
                res.status(500).json({ error: "Server error" });
            }
        });

        app.get('/api/hangman/data', async (req, res) => {
            try {
                const { username } = req.query;
                const query = { game: "Hangman" };
                if (username) query.username = username;

                // Fetch top 100 scores sorted by moves (asc) then time (asc)
                const scores = await scoreCollection
                    .find(query)
                    .sort({ moves: 1, time: 1 })
                    .limit(100)
                    .toArray();
                res.json(scores);
            } catch (err) {
                console.error("Error fetching scores:", err);
                res.status(500).json({ error: "Server error" });
            }
        });





    } catch (err) {
        console.error("Mongo error:", err);
    }
}
run().catch(console.dir);


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
