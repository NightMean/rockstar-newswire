const genres = {
    latest: null,
    music: 30,
    rockstar: 43,
    tips: 121,
    gtavi: 666,
    gtav: 702,
    updates: 705,
    fanvideos: 706,
    fanart: 708,
    creator: 728,
    rdr2: 736,
};
const puppeteer = require('puppeteer');
const { request } = require('https');
const fs = require('fs');
const RSS = require('rss');

const newsDir = './newswire.json';
const mainLink = 'https://graph.rockstargames.com?';
const refreshInterval = 7.2e+6; // 2 hours in milliseconds
const requestOptions = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Increased to 10 seconds to prevent timeouts
};
let articles, newsHash;

// Load existing articles from the local JSON file
fs.readFile(newsDir, 'utf8', (err, jsonString) => {
    articles = jsonString ? JSON.parse(jsonString) : {};
});

class newswire {
    constructor(genre, webhook) {
        if (typeof genres[genre] === 'undefined') {
            console.log('Invalid genre. Available genres:' + Object.keys(genres).map(gen => ' ' + gen));
            return;
        }
        this.genre = genre;
        this.genreID = genres[genre];
        this.webhook = webhook;
        this.main();
    }

    async main() {
        console.log('[READY] Started news feed for ' + this.genre + '. Feed refreshes every 2 hours.');
        newsHash = await getHashToken();
        console.log('[HASH] Fetched hash token:', newsHash);
        await this.updateRSSFeed();
        setInterval(async () => {
            console.log('[REFRESH] Refreshing news feed for ' + this.genre);
            await this.updateRSSFeed();
        }, refreshInterval);
    }

    async getArticleContent(url) {
        let browser;
        try {
            browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2' });

            const content = await page.evaluate(() => {
                // Target the main content area based on the HTML structure
                const articleElement = document.querySelector('.rockstargames-modules-core-newswire-article__body') || 
                                      document.querySelector('.content-container .content') || 
                                      document.querySelector('article');
                if (!articleElement) return 'Content not found';

                // Extract text from paragraphs
                const textElements = articleElement.querySelectorAll('p');
                const text = Array.from(textElements)
                    .map(p => p.innerText.trim())
                    .filter(t => t.length > 0)
                    .join('\n\n');

                // Extract images
                const images = Array.from(articleElement.querySelectorAll('img'))
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http'));

                // Build HTML content
                let htmlContent = '';
                if (text) {
                    htmlContent += text.split('\n\n').map(line => `<p>${line}</p>`).join('');
                }
                if (images.length > 0) {
                    htmlContent += `<img src="${images[0]}" alt="Article Image" style="max-width: 100%; height: auto;" />`;
                }

                return htmlContent || 'Content not found';
            });

            return content;
        } catch (error) {
            console.error(`[SCRAPE] Error fetching content from ${url}:`, error.message);
            return 'Error fetching content';
        } finally {
            if (browser) await browser.close();
        }
    }

    async getRecentArticles(limit = 10) {
        console.log('[CHECK] Fetching recent articles for ' + this.genre);
        return this.processRequest().then(async (res) => {
            if (res && res.errors != null) {
                if (res.data == null && res.errors[0].message == 'PersistedQueryNotFound') {
                    console.log('[HASH] Token has expired, generating new one.');
                    newsHash = await getHashToken().catch(console.log);
                    res = await this.processRequest().catch(console.log);
                } else {
                    console.log('[ERROR] Rockstar API couldn\'t retrieve articles:', res.errors);
                    return [];
                }
            }

            if (!res || !res.data || !res.data.posts || !res.data.posts.results) {
                console.log('[ERROR] Invalid API response:', res);
                return [];
            }

            let recentArticles = res.data.posts.results.slice(0, limit);
            let articlesToReturn = [];

            for (let article of recentArticles) {
                let check = articles && articles[article.id];
                let fullUrl = 'https://www.rockstargames.com' + article.url;
                let tags = article.primary_tags.map(tag => tag.name);
                let content = await this.getArticleContent(fullUrl);

                // If it's a new article, send Discord notification and add to articles
                if (!check) {
                    addArticle(article.id.toString(), article.url);
                    let newArticle = {
                        title: article.title,
                        link: fullUrl,
                        img: article['preview_images_parsed']['newswire_block']['d16x9'],
                        date: article.created,
                        tags: tags
                    };
                    this.sendArticle(newArticle);
                }

                articlesToReturn.push({
                    title: article.title,
                    link: fullUrl,
                    img: article['preview_images_parsed']['newswire_block']['d16x9'],
                    date: article.created,
                    tags: tags,
                    content: content
                });
            }
            return articlesToReturn;
        }).catch(err => {
            console.log('[ERROR] Error fetching articles:', err.message);
            return [];
        });
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
                console.log('[API] Status Code:', res.statusCode);
                if (res.statusCode < 200 || res.statusCode > 299) {
                    reject(new Error('[ERROR] Unable to process request: ' + res.statusCode + '\nReason: ' + res.statusMessage));
                }
                res.setEncoding('utf8');
                let responseBody = "";
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });
                res.on('end', () => {
                    console.log('[API] Response received');
                    resolve(JSON.parse(responseBody));
                });
            });
            req.on('error', (err) => {
                console.error('[API] Request error:', err.message);
                reject(err);
            });
            req.on('timeout', () => {
                req.destroy();
                console.error('[API] Request timed out');
                reject(new Error('Request timed out'));
            });
            req.end();
        });
    }

    async updateRSSFeed() {
        const fetchedArticles = await this.getRecentArticles();
        console.log('[RSS] Finished fetching articles, generating feed...');
        const feed = new RSS({
            title: `Rockstar Newswire - ${this.genre}`,
            description: 'Latest news from Rockstar Games',
            feed_url: 'http://your-server/rss.xml', // Replace with your actual server URL
            site_url: 'https://www.rockstargames.com/newswire',
            language: 'en'
        });

        fetchedArticles.forEach(article => {
            feed.item({
                title: article.title,
                url: article.link,
                description: article.content,
                date: new Date(article.date),
                guid: article.link,
                categories: article.tags
            });
        });

        fs.writeFileSync('rss.xml', feed.xml({ indent: true }));
        console.log('[RSS] Feed updated with ' + fetchedArticles.length + ' articles.');
    }

    sendArticle(article) {
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
        });
        req.on('timeout', () => {
            req.destroy();
            console.error('[ERROR] Request timedout');
        });
        req.write(JSON.stringify(embed));
        req.end();
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
            const browser = await puppeteer.launch({ headless: true });
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
            await page.goto('https://www.rockstargames.com/newswire');
        } catch (e) {
            rej(e.stack);
        }
    });
}

// Catch unhandled promise rejections for better debugging
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = newswire;
