# Rockstar Newswire Tracker

A lightweight, powerful tool to track the latest [Rockstar Games Newswire](https://www.rockstargames.com/newswire) updates. Automatically post news to your Discord server via Webhooks or serve a local RSS feed.

## Features
- **Discord Integration**: Seamlessly post new articles to your Discord channel.
- **RSS Feed**: Generates a strictly typed RSS 2.0 feed (`feed.xml`) for use with any RSS reader.
- **Multiple Categories**: specialized tracking for specific games like **GTA Online**, **Red Dead Online**, or general **Rockstar Announcements**.
- **Auto-Refresh**: Automatically polls for new content every 2 hours (configurable).
- **Docker Support**: Easy deployment with Docker and Docker Compose.

## Installation & Usage

### 1. Configuration
The application is configured via `config.yaml`.
1. Configure `config.yaml`.
2. Enable or disable features (`enableDiscord`, `enableRSS`).
3. Set your **Discord Webhook URL** (if using Discord integration).
4. Set the **Refresh Interval** in minutes (default is 120 minutes = 2 hours).
5. Uncomment the **genres** (news categories) you want to track. By default, only `latest` is enabled.

### 2. Running with Docker (Recommended)
Ensure you have Docker and Docker Compose installed.

```bash
# Build and start the container
docker-compose up -d
```

- The RSS feed will be available at: `http://localhost:3000/feed.xml`
- Configuration (`config.yaml`) and data (`newswire.json`) are mounted as volumes, so you can edit config or check data without entering the container.

### 3. Running Locally (Node.js)
Ensure you have [Node.js](https://nodejs.org/) installed.

```bash
# Install dependencies
npm install

# Start the application
node index.js
```

## Configuration File (`config.yaml`)
```yaml
enableDiscord: true
enableRSS: true
webhookUrl: "YOUR_WEBHOOK_URL_HERE"
refreshInterval: 120 # Minutes
genres:
  - latest
  # - gta_online
```

## Supported News Types (Genres)
See `config.yaml` for the full list of supported genres. You can uncomment any genre in the file to enable tracking for it.

- `latest`
- `announcements`
- `gta_online`
- `red_dead_online`
- ... and many others.

## API Reference
For developers who want to integrate the newswire into their own applications:

```javascript
/* 
    Usage: new newswire(genre, options);
    genre: String (One of the supported categories)
    options: Object { webhookUrl, enableRSS, refreshInterval (ms) }
*/

const newswire = require('./newswire');
const tracker = new newswire('gta_online', {
    webhookUrl: 'https://discord.com/api/webhooks/...',
    enableRSS: true,
    refreshInterval: 7200000
});
```

## Credits
- [Rockstar Games Newswire](https://www.rockstargames.com/newswire)
- [Puppeteer](https://www.npmjs.com/package/puppeteer) (Virtual browser for network tracing)