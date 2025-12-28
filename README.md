# Rockstar Newswire Tracker

A lightweight, powerful tool to track the latest [Rockstar Games Newswire](https://www.rockstargames.com/newswire) updates. Automatically post news to your Discord server via Webhooks or serve a local RSS feed.

## Features
- **Discord Integration**: Seamlessly post new articles to your Discord channel.
- **RSS Feed**: Generates a strictly typed RSS 2.0 feed (`feed.xml`) for use with any RSS reader.
- **Multiple Categories**: specialized tracking for specific games like **GTA Online**, **Red Dead Online**, or general **Rockstar Announcements**.
- **Auto-Refresh**: Automatically polls for new content every 2 hours (configurable).

## Installation
Ensure you have [Node.js](https://nodejs.org/) installed.

```bash
npm install
# or
yarn install
```

## Usage

### 1. Discord Webhook Integration
To start tracking news and posting to Discord:

1. Create a [Webhook](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks) in your Discord channel.
2. Configure `newswire.js` script for `genre` and `webhookUrl` according to your needs. 

```javascript
// Configuration
const genre = 'latest'; // See 'Supported Newswire Categories' below
const webhookUrl = 'YOUR_WEBHOOK_URL_HERE';
```

### 2. RSS Feed Server
To run a local RSS feed server:

1. Run the server:
   ```bash
   node server.js
   ```
2. The server will start on port `3000` by default.
3. Access the feed at:
   - `http://localhost:3000/rss`
   - `http://localhost:3000/feed.xml`

## Configuration
- **Refresh Interval**: The feed updates every 2 hours (7,200,000 ms) by default. To change this, modify the `refreshInterval` variable in `newswire.js`.
- **Data Persistence**: The script uses `newswire.json` to track posted articles and prevent duplicates. If you move the bot, make sure to move this file as well.

## Supported News Types (Genres)
Pass one of these keys as the `genre` argument:

- `latest` (Latest news from any type that shows on newswire homepage)
- `announcements` (General Rockstar announcements)
- `updates` (Any released game updates)
- `rockstar` (Rockstar company updates)
- `backward_compatibility` (Backward compatibility news)
- `circoloco_records` (CircoLoco Records news)
- `content_updates` (General Content updates)
- `contest` (General Contests news)
- `creator_jobs` (Creator jobs articles featured by Rockstar)
- `crews` (Crew news)
- `crews_recruiting` (Crew recruiting)
- `gameplay_clips` (Gameplay clips articles featured by Rockstar)
- `events` (Any Rockstar in-game event news)
- `fan_art` (General fans' art articles from any Rockstar game)
- `fan_videos` (General fans' showoff videos articles from any Rockstar game)
- `game_tips` (General game tips from Rockstar)
- `music` (Music production articles)
- `livestream` (Livestream announcements)
- `rockstar_launcher` (Rockstar Games Launcher updates)
- `sales` (Rockstar Warehouse sales and discounts)
- `twitch` (Twitch features and drops)
- `warehouse` (Rockstar Warehouse news)
- `in_memoriam` (Recent Passings)
- `grand_theft_auto_the_trilogy` (GTA: The Trilogy news)
- `grand_theft_auto_v` (GTA: V general news)
- `grand_theft_auto_vi` (GTA: VI general news)
- `gta_online` (GTA Online news)
- `la_noire` (L.A. Noire news)
- `max_payne` (Max Payne news)
- `max_payne_3` (Max Payne 3 news)
- `red_dead_online` (Red Dead Online news)
- `red_dead_redemption` (Red Dead Redemption news)
- `red_dead_redemption_2` (Red Dead Redemption 2 general news)

## API Reference
For developers who want to integrate the newswire into their own applications:

```javascript
/* 
    Usage: new newswire(genre, webhookUrl);
    genre: String (One of the supported categories)
    webhookUrl: String (Discord Webhook URL, or null if using only RSS)
*/

const newswire = require('rockstar-newswire');
const tracker = new newswire('gta_online', 'https://discord.com/api/webhooks/...');
```

## Credits
- [Rockstar Games Newswire](https://www.rockstargames.com/newswire)
- [Puppeteer](https://www.npmjs.com/package/puppeteer) (Virtual browser for network tracing)