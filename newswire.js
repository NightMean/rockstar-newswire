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
const newsDir = './newswire.json';
const mainLink = 'https://graph.rockstargames.com?';
const refreshInterval = 7.2e+6; // 2 hours in milliseconds. If you would like to change it (http://www.unitconversion.org/time/seconds-to-milliseconds-conversion.html)
const requestOptions = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 1000,
};
let articles, newsHash;

fs.readFile(newsDir, 'utf8', (err, jsonString) => {
    articles = jsonString ? JSON.parse(jsonString) : {};
});

class newswire {
    constructor(genre, webhook) {
        if (typeof genres[genre] == 'undefined') return console.log('Invalid genre. Available genres:' + Object.keys(genres).map(gen => ' ' + gen));
        this.genre = genre;
        this.genreID = genres[genre];
        this.webhook = webhook;
        this.main();
    }

    async main() {
        let article;
        console.log('[READY] Started news feed for ' + this.genre + '. Feed refreshes every 2 hours.');
        newsHash = await getHashToken();

        await this.updateRSS();

        article = await this.getNewArticle();
        if (!(article instanceof TypeError) && article.title) {
            this.sendArticle(article)
        }
        setInterval(async _ => {
            console.log('[REFRESH] Refreshing news feed for ' + this.genre);

            await this.updateRSS();

            article = await this.getNewArticle();
            !(article instanceof TypeError) && article.title ? this.sendArticle(article) : console.log(article.message);
        }, refreshInterval);
    }

    sendArticle(article) {
        if (!this.webhook) return;
        console.log(`[NEW] ${this.genre}: ${article.title} (${article.link})`);
        article.tags = '' + article.tags.map(tag => '`' + tag + '` ');
        const embed = {
            'embeds': [{
                'author': {
                    'name': 'Newswire',
                    'url': 'https://www.rockstargames.com/newswire',
                    'icon_url': 'https://img.icons8.com/color/48/000000/rockstar-games.png'
                },
                'title': article.title,
                'url': article.link,
                'description': article.tags,
                'color': 15258703,
                'fields': [],
                'image': {
                    'url': article.img
                },
                'footer': {
                    "icon_url": "https://img.icons8.com/color/48/000000/rockstar-games.png",
                    "text": article.date
                }
            }]
        };
        const req = request(this.webhook, requestOptions, (res) => {
            if (res.statusCode < 200 || res.statusCode > 299)
                console.error('[ERROR] Unable to process request: ' + res.statusCode + '\nReason: ' + res.statusMessage);
        });
        req.on('error', (err) => {
            console.error(err);
        })

        req.on('timeout', () => {
            req.destroy()
            console.error('[ERROR] Request timedout');
        })

        req.write(JSON.stringify(embed));
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
                addArticle(article.id.toString(), article.url);
                return {
                    title: article.title,
                    link: article.url,
                    img: article['preview_images_parsed']['newswire_block']['d16x9'],
                    date: article.created,
                    tags: tags
                }
            } else {
                return new TypeError('[CHECK] No new articles found for ' + this.genre)
            }
        }).catch(console.log);
    }

    async updateRSS() {
        console.log('[RSS] Updating RSS feed...');
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
            console.log('[RSS] Feed updated successfully.');
        } catch (e) {
            console.error('[RSS] Failed to update feed:', e);
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
            fs.writeFile(newsDir, JSON.stringify(articles, null, 2), (err) => {
                if (err) console.error('[ERROR] Failed to save articles to db due ' + err);
            });
        } else {
            console.log('Article ID: ' + article + ' already exists in database.');
        }
    }
}

async function getHashToken() {
    return new Promise(async (res, rej) => {
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
            rej(e.stack);
        }
    });
};

module.exports = newswire;
