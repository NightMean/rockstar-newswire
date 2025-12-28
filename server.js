const http = require('http');
const fs = require('fs');
const newswire = require('./newswire');

// Configuration
const PORT = 3000;
const GENRE = 'latest'; // Default genre
const FEED_FILE = 'feed.xml';

// Initialize Newswire (starts fetch loop automatically)
console.log(`[SERVER] Starting Newswire fetcher for '${GENRE}'...`);
// Pass null as webhook to only generate RSS
new newswire(GENRE, null);

// Create HTTP Server
const server = http.createServer((req, res) => {
    console.log(`[SERVER] Request: ${req.method} ${req.url}`);

    if (req.url === '/' || req.url === '/rss' || req.url === '/feed.xml') {
        fs.readFile(FEED_FILE, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(503, { 'Content-Type': 'text/plain' });
                    res.end('Feed is initializing, please try again in a few seconds.');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                    console.error('[SERVER] Error reading feed file:', err);
                }
            } else {
                res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
                res.end(content);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`[SERVER] RSS Feed running at http://localhost:${PORT}/`);
    console.log(`[SERVER] Press Ctrl+C to stop.`);
});
