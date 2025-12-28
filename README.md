# rockstar-newswire
A lightweight Rockstar [newswire](https://www.rockstargames.com/newswire) tracker to bring latest news to your platform.

Currently supports discord [webhooks](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks) and you can easily change it to return URL for to be used on any other platform.

## Install
- Install the required Node packages via `npm i` or `yarn install`

## API

```js
    let newswire = require('./newswire');
    let latestNews = new newswire(type, webhookURL);
    // Available Types: rdr2, gtav, latest, music, fanart, fanvideos, creator, tips, rockstar, updates,
    // Webhook URL: https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks
    // News should automatically post and update every 2 hours.
```
### Available types
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

## Notes
- You require discord [webhook URL](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
- Feed refreshes every 2 hours to make sure its up-to-date. If you would like to change it then you're required to change this [variable](https://github.com/Carbowix/rockstar-newswire/blob/master/newswire.js#L18) using that time [converter](http://www.unitconversion.org/time/seconds-to-milliseconds-conversion.html). It has to be in **milliseconds** in order to operate properly.
- It's recommened to take `newsdb.json` with you if you're porting the project to another host to prevent redundant news posts.
- It is not guranteed that it can trace multiple new news posts of the same type since it only traces the last post posted. In-order to avoid such error, you can lower the news feed refresh rate as specified previously. If you have a idea on how to improve it then feel free to contribute.
- This is a small research project and it's not meant to be used as a network harm tool.
## Demo
![](./demo.png "Example of news feed.")

## RSS Feed
To run a local server to serve the generated RSS feed:
1. Run `node server.js` to start the server.
2. The server will start on port 3000 (default).
3. Access the feed at `http://localhost:3000/rss` (or `/feed.xml`).
The feed is automatically updated every 2 hours (default refresh interval).

## Credits
- Rockstar [newswire](https://www.rockstargames.com/newswire).
- [puppeteer](https://www.npmjs.com/package/puppeteer) for their virtual browser network tracing.