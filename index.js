const fs = require('fs');
const http = require('http');
const yaml = require('js-yaml');
const newswire = require('./newswire');

// Load Configuration
let config;
try {
    const fileContents = fs.readFileSync('./config.yaml', 'utf8');
    config = yaml.load(fileContents);
} catch (e) {
    console.error('[ERROR] Failed to load config.yaml:', e);
    process.exit(1);
}

// Environment Variable Override for Webhook
if (process.env.DISCORD_WEBHOOK_URL) {
    config.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
}

// Validate Webhook for Discord
if (config.enableDiscord && (!config.webhookUrl || config.webhookUrl === 'YOUR_WEBHOOK_URL_HERE')) {
    console.warn('[WARN] Discord is enabled but Webhook URL is not configured. Discord posts will be skipped.');
}

const genres = config.genres || ['latest'];
const PORT = process.env.PORT || 3000;
const FEED_FILE = 'feed.xml';

// Start Newswire Instances
console.log(`[INIT] Starting Rockstar Newswire Tracker...`);
console.log(`[INIT] Enabled Genres: ${genres.join(', ')}`);
console.log(`[INIT] Services: Discord=${config.enableDiscord}, RSS=${config.enableRSS}`);

genres.forEach(genre => {
    // We pass the config options to the class
    new newswire(genre, {
        webhookUrl: config.enableDiscord ? config.webhookUrl : null,
        enableRSS: config.enableRSS,
        refreshInterval: config.refreshInterval
    });
});

// Start RSS Server if enabled
if (config.enableRSS) {
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
    });
} else {
    // If RSS is disabled, we might still want to keep the process alive if Discord is enabled
    // The newswire class uses setInterval, so the process will stay alive unless crashed/stopped.
    console.log('[SERVER] RSS Server is disabled in config.');
}
