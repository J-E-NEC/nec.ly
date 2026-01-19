const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { nanoid } = require('nanoid');
const app = express();
// const PORT = 3000;
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Initialize SQLite database
// const db = new sqlite3.Database(':memory:');
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    // db.run('CREATE TABLE urls (id INTEGER PRIMARY KEY, shortCode TEXT, originalUrl TEXT)');
    // db.run('CREATE TABLE urls (id INTEGER PRIMARY KEY, shortCode TEXT, originalUrl TEXT, clicks INTEGER DEFAULT 0)');
    db.run('CREATE TABLE IF NOT EXISTS urls (id INTEGER PRIMARY KEY, shortCode TEXT, originalUrl TEXT, clicks INTEGER DEFAULT 0)');
});

// Middleware to parse JSON
app.use(express.json());

// Serve static files (HTML frontend)
app.use(express.static('public'));

// URL Shortening
app.post('/shorten', (req, res) => {
    let { url } = req.body;

    // Add 'https://' if missing
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    // Check if URL already exists
    db.get('SELECT shortCode FROM urls WHERE originalUrl = ?', [url], (err, row) => {
        if (row) {
            res.json({ shortUrl: `${BASE_URL}/${row.shortCode}` });
        } else {
            const shortCode = nanoid(6);
            db.run('INSERT INTO urls (shortCode, originalUrl) VALUES (?, ?)', [shortCode, url], (err) => {
                if (err) return res.status(500).send('Database error');
                res.json({ shortUrl: `${BASE_URL}/${shortCode}` });
            });
        }
    });
});

// Redirect to original URL
app.get('/:shortCode', (req, res) => {
    const { shortCode } = req.params;

    // Update the click count
    db.run('UPDATE urls SET clicks = clicks + 1 WHERE shortCode = ?', [shortCode]);

    db.get('SELECT originalUrl FROM urls WHERE shortCode = ?', [shortCode], (err, row) => {
        if (row) {
            res.redirect(row.originalUrl);
        } else {
            res.status(404).send('URL not found');
        }
    });
});

// Get all links and their click counts
app.get('/api/stats', (req, res) => {
    db.all('SELECT * FROM urls ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on ${BASE_URL}`);
});