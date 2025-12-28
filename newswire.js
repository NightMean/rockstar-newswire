const genres = {
    latest: null,
    announcements: 722,
    content_updates: 705,
    backward_compatibility: 735,
    rockstar_launcher: 739,
    fan_videos: 706,
    livestream: 711,
    in_memoriam: 730,
    twitch: 712,
    warehouse: 191,
    contest: 161,
    crews: 621,
    crews_recruiting: 725,
    gameplay_clips: 727,
    events: 13,
    crews: 621,
    music: 30,
    rockstar: 43,
    sales: 661,
    game_tips: 121,
    max_payne: 25,
    max_payne_3: 27,
    grand_theft_auto_vi: 666,
    gta_online: 702,
    grand_theft_auto_v: 591,
    grand_theft_auto_the_trilogy: 751,
    updates: 705,
    fan_videos: 706,
    fan_art: 708,
    creator_jobs: 728,
    red_dead_online: 736,
    red_dead_redemption_2: 716,
    red_dead_redemption: 40,
    la_noire: 86,
    circoloco_records: 1005,
};
const puppeteer = require('puppeteer');
const {
    request
} = require('https');
const fs = require('fs');
const { Feed } = require('feed');
const path = require('path');
const newsDir = path.join(__dirname, 'newswire.json');
const mainLink = 'https://graph.rockstargames.com?';
const refreshInterval = 7.2e+6; // 2 hours in milliseconds. If you would like to change it (http://www.unitconversion.org/time/seconds-to-milliseconds-conversion.html)
const requestOptions = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
};
let articles, newsHash;

const articlesLoaded = new Promise((resolve, reject) => {
    fs.readFile(newsDir, 'utf8', (err, jsonString) => {
        if (err) {
            if (err.code === 'ENOENT') {
                articles = {};
            } else {
                console.error('[ERROR] Failed to read articles file:', err);
                articles = {};
            }
        } else {
            try {
                articles = jsonString ? JSON.parse(jsonString) : {};
            } catch (e) {
                console.error('[ERROR] Failed to parse articles JSON (First 50 chars):', jsonString.substring(0, 50));
                console.error('[ERROR] Parse error:', e);
                articles = {};
            }
        }
        resolve(articles);
    });
});

class newswire {
    constructor(genre, options) {
        if (typeof genres[genre] == 'undefined') return console.log('Invalid genre. Available genres:' + Object.keys(genres).map(gen => ' ' + gen));
        this.genre = genre;
        this.genreID = genres[genre];
        this.webhook = options.webhookUrl;
        this.enableRSS = options.enableRSS;
        this.onRSSUpdate = options.onRSSUpdate; // Callback for RSS data
        this.refreshInterval = options.refreshInterval || 7.2e+6;
        this.discordProfileName = options.discordProfileName;
        this.discordAvatarUrl = options.discordAvatarUrl;
        this.dateFormat = options.dateFormat;

        // Remove direct main() call from constructor to allow async/better flow control if needed, 
        // but for now keeping it to match original behavior but invoking with new config
        this.main();
    }

    async main() {
        // Ensure data is loaded before starting
        await articlesLoaded;

        let article;
        // console.log('[READY] Started news feed for ' + this.genre + '. Feed refreshes every ' + (this.refreshInterval / 60000) + ' minutes.');
        // console.log('[INIT] Fetching API Token (this may take a minute)...'); // Moved to getHashToken
        console.log('[READY] Started news feed for ' + this.genre + '.');
        newsHash = await getHashToken();

        if (this.enableRSS) {
            const items = await this.updateRSS();
            if (this.onRSSUpdate) this.onRSSUpdate(items);
        }

        article = await this.getNewArticle();
        if (!(article instanceof TypeError) && article.title) {
            this.sendArticle(article)
        }
        setInterval(async _ => {
            console.log('[REFRESH] Refreshing news feed for ' + this.genre);

            if (this.enableRSS) {
                const items = await this.updateRSS();
                if (this.onRSSUpdate) this.onRSSUpdate(items);
            }

            article = await this.getNewArticle();
            !(article instanceof TypeError) && article.title ? this.sendArticle(article) : console.log(article.message);
        }, this.refreshInterval);
    }

    sendArticle(article) {
        if (!this.webhook) return;
        console.log(`[NEW] ${this.genre}: ${article.title} (${article.link})`);

        let dateStr = article.date;
        try {
            const dateObj = new Date(article.date);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();

            if (this.dateFormat === 'MM/DD/YYYY') {
                dateStr = `${month}/${day}/${year}`;
            } else {
                // Default to DD/MM/YYYY
                dateStr = `${day}/${month}/${year}`;
            }
        } catch (e) {
            console.error('[ERROR] Failed to format date:', e);
        }

        article.tags = article.tags.join(', ');

        // Construct Webhook Payload with custom username/avatar and embed
        const payload = {
            username: this.discordProfileName,
            avatar_url: this.discordAvatarUrl,
            embeds: [{
                'author': {
                    'name': 'Rockstar Newswire',
                    'url': 'https://www.rockstargames.com/newswire',
                    'icon_url': 'https://yt3.googleusercontent.com/-jCZaDR8AoEgC6CBPWFubF2PMSOTGU3nJ4VOSo7aq3W6mR8tcRCgygd8fS-4Ra41oHPo3F3P=s900-c-k-c0x00ffffff-no-rj'
                },
                'title': article.title,
                'url': article.link,
                'description': article.subtitle || "",
                'color': 16756992,
                'fields': [],
                'image': {
                    'url': article.img
                },
                'footer': {
                    "text": article.tags + ' • ' + dateStr
                }
            }]
        };

        const req = request(this.webhook, requestOptions, (res) => {
            if (res.statusCode < 200 || res.statusCode > 299) {
                console.error('[ERROR] Unable to process request: ' + res.statusCode + '\nReason: ' + res.statusMessage);
            } else {
                console.log('[DISCORD] Notification sent successfully.');
            }
            // Vital: Consume response data to free up memory and prevent timeout
            res.resume();
        });
        req.on('error', (err) => {
            console.error(err);
        })

        req.on('timeout', () => {
            req.destroy()
            console.error('[ERROR] Request timedout');
        })

        req.write(JSON.stringify(payload));
        req.end();
    }

    async getNewArticle() {
        console.log('[CHECK] Checking for new articles in ' + this.genre);
        return this.processRequest().then(async (res) => {
            if (res && res.errors != null) {
                if (res.data == null && res.errors[0].message == 'PersistedQueryNotFound') {
                    console.log('[HASH] Token has expired, generating new one.');
                    newsHash = await getHashToken().catch(console.log);
                    res = await this.processRequest().catch(console.log);
                } else {
                    return new TypeError('[ERROR] Rockstar API couldn\'t retrieve articles.');
                }
            }

            let article = res.data.posts.results[0];
            let check = articles && articles[article.id]
            if (!check) {
                let tags = [];
                article.url = 'https://www.rockstargames.com' + article.url;
                await article.primary_tags.map(tag => tags.push(tag.name))
                let subtitle = "";
                try {
                    // Fetch full article to get subtitle
                    const fullDetails = await this.getArticle(article.id);
                    if (fullDetails && fullDetails.tina && fullDetails.tina.payload && fullDetails.tina.payload.meta) {
                        subtitle = fullDetails.tina.payload.meta.subtitle || "";
                    }
                } catch (err) {
                    console.error('[ERROR] Failed to fetch article details for subtitle:', err);
                }

                addArticle(article.id.toString(), article.url);
                return {
                    title: article.title,
                    link: article.url,
                    img: article['preview_images_parsed']['newswire_block']['d16x9'],
                    date: article.created,
                    tags: tags,
                    subtitle: subtitle
                }
            } else {
                return new TypeError('[CHECK] No new articles found for ' + this.genre)
            }
        }).catch(console.log);
    }

    async updateRSS() {
        // console.log('[RSS] Updating RSS feed...'); // Redundant with index.js log
        try {
            let res = await this.processRequest().catch(console.log);

            if (res && res.errors != null) {
                if (res.data == null && res.errors[0].message == 'PersistedQueryNotFound') {
                    console.log('[RSS] Token has expired, generating new one.');
                    newsHash = await getHashToken().catch(console.log);
                    res = await this.processRequest().catch(console.log);
                }
            }

            if (!res || !res.data || !res.data.posts) {
                console.log('[RSS] No data received.');
                return;
            }

            const articles = res.data.posts.results;
            const feed = new Feed({
                title: "Rockstar Newswire (" + this.genre + ")",
                description: "Latest news from Rockstar Games for " + this.genre,
                id: "https://www.rockstargames.com/newswire",
                link: "https://www.rockstargames.com/newswire",
                language: "en",
                image: "https://img.icons8.com/color/48/000000/rockstar-games.png",
                favicon: "https://www.rockstargames.com/favicon.ico",
                copyright: "All rights reserved by Rockstar Games",
                updated: new Date(),
                generator: "Rockstar Newswire RSS Generator",
                author: {
                    name: "Rockstar Games",
                    link: "https://www.rockstargames.com"
                }
            });

            articles.forEach(post => {
                let imageUrl = "";
                try {
                    imageUrl = post.preview_images_parsed.newswire_block.d16x9;
                } catch (e) { }

                let link = 'https://www.rockstargames.com' + post.url;

                // We will populate content later if possible, but for now we put title/preview
                // actually we can't wait here because updateRSS is async but forEach is sync callback
                // We should change to for...of loop to await content fetching
            });

            // Refactoring to for-of loop to support async operations
            for (const post of articles) {
                let imageUrl = "";
                try {
                    imageUrl = post.preview_images_parsed.newswire_block.d16x9;
                } catch (e) { }

                let link = 'https://www.rockstargames.com' + post.url;
                let content = post.title; // Default fall back

                try {
                    const fullArticle = await this.getArticle(post.id);
                    if (fullArticle) {
                        content = this.parseContent(fullArticle);
                    }
                } catch (e) {
                    console.error(`[RSS] Failed to fetch content for ${post.id}:`, e.message);
                }

                feed.addItem({
                    title: post.title,
                    id: post.id.toString(),
                    link: link,
                    description: post.title,
                    content: content,
                    author: [
                        {
                            name: "Rockstar Games",
                            link: "https://www.rockstargames.com"
                        }
                    ],
                    date: new Date(post.created),
                    image: imageUrl
                });
            }

            fs.writeFileSync('feed.xml', feed.rss2());
            //            console.log('[RSS] Feed updated successfully.');
            // Instead of writing here, we return the feed object or articles
            // But to keep it effectively reusable, let's just return the feed object.
            // Actually, the index.js needs to merge items. So we should return the list of items with their content parsed.

            // We need to return an array of items compatible with `feed.addItem`
            const feedItems = [];
            // Refactoring to for-of loop to support async operations
            for (const post of articles) {
                let imageUrl = "";
                try {
                    imageUrl = post.preview_images_parsed.newswire_block.d16x9;
                } catch (e) { }

                let link = 'https://www.rockstargames.com' + post.url;
                let content = post.title; // Default fall back

                try {
                    const fullArticle = await this.getArticle(post.id);
                    if (fullArticle) {
                        content = this.parseContent(fullArticle);
                    }
                } catch (e) {
                    console.error(`[RSS] Failed to fetch content for ${post.id}:`, e.message);
                }

                feedItems.push({
                    title: post.title,
                    id: post.id.toString(),
                    link: link,
                    description: post.title, // Description is often summary, but using title as fallback
                    content: content,
                    author: [
                        {
                            name: "Rockstar Games",
                            link: "https://www.rockstargames.com"
                        }
                    ],
                    date: new Date(post.created),
                    image: imageUrl,
                    // Additional metadata for multiple feeds if needed
                    category: this.genre
                });
            }

            return feedItems;

        } catch (e) {
            console.error('[RSS] Failed to fetch/parse feed data:', e);
            return [];
        }
    }

    async getArticle(id) {
        return new Promise((resolve, reject) => {
            const searchParams = new URLSearchParams([
                ['operationName', 'NewswirePost'],
                ['variables', JSON.stringify({
                    locale: 'en_us',
                    id_hash: id
                })],
                ['extensions', JSON.stringify({
                    persistedQuery: {
                        version: 1,
                        sha256Hash: '555658813abe5acc8010de1a1feddd6fd8fddffbdc35d3723d4dc0fe4ded6810'
                    }
                })]
            ]);

            const req = request(mainLink + searchParams.toString(), requestOptions, (res) => {
                if (res.statusCode < 200 || res.statusCode > 299)
                    resolve(null); // Just return null on error to skip

                let responseBody = "";
                res.on('data', (chunk) => { responseBody += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(responseBody);
                        if (json.data && json.data.post) {
                            resolve(json.data.post);
                        } else {
                            resolve(null);
                        }
                    } catch (e) { resolve(null); }
                });
            });
            req.on('error', (err) => { resolve(null); });
            req.end();
        });
    }

    parseContent(post) {
        if (!post.tina || !post.tina.payload || !post.tina.payload.content) return post.title;

        const imgBase = "https://media-rockstargames-com.akamaized.net";
        let autoHtml = "";

        // Add Subtitle
        const subtitle = post.subtitle || (post.tina.payload.meta && post.tina.payload.meta.subtitle);
        if (subtitle) {
            autoHtml += `<h3><strong>${subtitle}</strong></h3><br/>`;
        }

        const traverse = (node) => {
            if (!node) return "";

            if (Array.isArray(node)) {
                return node.map(traverse).join("");
            }

            if (typeof node === 'object') {
                let sectionHtml = "";

                // Handle EventInfo / FeaturedEventInfo (Sections with optional Images and Titles)
                if (['EventInfo', 'FeaturedEventInfo'].includes(node._template)) {
                    // 1. Images
                    if (node.images && Array.isArray(node.images)) {
                        node.images.forEach(imgEntry => {
                            if (imgEntry.image && imgEntry.image.sources) {
                                let src = "";
                                if (imgEntry.image.sources.en_us) {
                                    src = imgEntry.image.sources.en_us.desktop || imgEntry.image.sources.en_us.mobile;
                                }
                                if (src) {
                                    if (src.startsWith('/')) src = imgBase + src;
                                    const alt = imgEntry.image._memoq?.alt || "Article Image";
                                    // Removing conflicting styles, just standard img
                                    sectionHtml += `<img src="${src}" alt="${alt}" /><br/>`;
                                }
                            }
                        });
                    }

                    // 2. Title (Heading)
                    if (node._memoq && node._memoq.title) {
                        // User stated heading 2 shows, so we upgrading to h2 + strong to match standard headers
                        sectionHtml += `<h2><strong>${node._memoq.title}</strong></h2>`;
                    }

                    // 3. Content (Recursive)
                    if (node.content) {
                        sectionHtml += traverse(node.content);
                    }

                    return sectionHtml + "<br/>";
                }

                // Handle Grid
                if (node._template === 'Grid' && node.content) {
                    return traverse(node.content);
                }

                // Handle HTMLElement (Raw HTML)
                if (node._template === 'HTMLElement' && node._memoq && node._memoq.content) {
                    return node._memoq.content + "<br/>";
                }

                // Handle RockstarVideoPlayer (or generic embed)
                // In dump: _template: "RockstarVideoPlayer"
                if (node._template === 'RockstarVideoPlayer') {
                    // Usually videos might need special handling or might simply not be supported well in RSS without iframe
                    // We can try to add a link or placeholder if needed, but for now ignoring or basic check
                    // If there's no direct video URL, meaningful support is hard.
                }

                // Fallback: Traverse generic object keys if it's strictly a container we missed
                // But generally sticking to the templates above is cleaner. 
                // However, let's process 'content' key if it exists on unknown nodes
                if (node.content) {
                    return traverse(node.content);
                }
            }
            return "";
        };

        const contentHtml = traverse(post.tina.payload.content);
        return (autoHtml + contentHtml) || post.title;
    }

    async processRequest() {
        return new Promise(async (resolve, reject) => {
            const searchParams = new URLSearchParams([
                ['operationName', 'NewswireList'],
                ['variables', JSON.stringify({
                    page: 1,
                    tagId: this.genreID,
                    metaUrl: '/newswire',
                    locale: 'en_us'
                })],
                ['extensions', JSON.stringify({
                    persistedQuery: {
                        version: 1,
                        sha256Hash: newsHash
                    }
                })]
            ]);

            const req = request(mainLink + searchParams.toString(), requestOptions, (res) => {
                if (res.statusCode < 200 || res.statusCode > 299)
                    reject(new Error('[ERROR] Unable to process request: ' + res.statusCode + '\nReason: ' + res.statusMessage));
                res.setEncoding('utf8');
                let responseBody = "";
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    resolve(JSON.parse(responseBody));
                });
            });
            req.on('error', (err) => {
                reject(err);
            });

            req.end();
        });
    }
}

function addArticle(article, url) {
    if (articles) {
        if (!articles[article]) {
            articles[article] = url;
            try {
                fs.writeFileSync(newsDir, JSON.stringify(articles, null, 2));
            } catch (err) {
                console.error('[ERROR] Failed to save articles to db:', err);
            }
        } else {
            console.log('Article ID: ' + article + ' already exists in database.');
        }
    }
}

let tokenPromise = null;
async function getHashToken() {
    if (tokenPromise) return tokenPromise;
    console.log('[INIT] Fetching API Token (this may take a minute)...');
    tokenPromise = new Promise(async (res, rej) => {
        try {
            const browser = await puppeteer.launch({
                headless: true
            });
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', interceptedRequest => {
                if (interceptedRequest.url().includes('operationName=NewswireList')) {
                    let url = interceptedRequest.url();
                    let params = url.split('?')[1];
                    let query = new URLSearchParams(params);
                    let hash = '';
                    for (let pair of query.entries()) {
                        if (pair[0] == 'extensions' && pair[1]) {
                            hash = JSON.parse(pair[1])['persistedQuery']['sha256Hash'];
                            interceptedRequest.abort();
                            browser.close();
                            res(hash);
                        }
                    }
                } else {
                    interceptedRequest.continue();
                }
            });
            page.goto('https://www.rockstargames.com/newswire');
        } catch (e) {
            tokenPromise = null; // Reset on failure so we can try again
            rej(e.stack);
        }
    });
    return tokenPromise;
};

// Also export setHashToken if we want to set it from outside, 
// OR just rely on getHashToken being called externally and set internally?
// The global `newsHash` is used in `processRequest`. 
// We should probably allow setting it or just expose getHashToken and let the class use the global `newsHash` 
// but wait, `processRequest` uses `newsHash` which is module-scoped. 
// If we move `getHashToken` logic to index.js, we need a way to tell this module what the hash is.
// OR we keep `getHashToken` here and just make it single-execution as done above.
// But `newswire` instances need to know when `newsHash` is ready.

// Let's modify the class to NOT fetch token itself in main(), but accept it or wait for it.
// Actually, `main()` currently calls `getHashToken()`. 
// Since `getHashToken` is now a singleton promise, multiple instances calling it will get the same promise.
// So `newsHash = await getHashToken()` in `main()` is actually fine! 
// The first one triggers it, others wait.
// HOWEVER, `newsHash` is a module-level variable. 
// If instance A sets it, instance B sets it same value. 
// That's fine.

module.exports = {
    newswire,
    getHashToken
};
