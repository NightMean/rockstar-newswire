const path = require('path');
const fs = require('fs');
const https = require('https');

const repoNewswire = require(path.join(__dirname, '..', '..', 'src', 'newswire'));
const getHashToken = repoNewswire.getHashToken;

const mainLink = 'https://graph.rockstargames.com?';

const genres = {
  latest: null,
  gta_online: 702,
  // (other genres omitted for brevity)
};

function fetchGraph(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
  const FORCE = (process.env.FORCE || 'false').toLowerCase() === 'true';
  const GENRE = process.env.GENRE || 'gta_online';

  if (!DISCORD_WEBHOOK) {
    console.log('[WARN] DISCORD_WEBHOOK not set — the script will only log found entries.');
  }

  if (typeof genres[GENRE] === 'undefined' || genres[GENRE] === null && GENRE !== 'latest') {
    console.error(`[ERROR] Unknown genre "${GENRE}".`);
    process.exit(2);
  }

  console.log('[INFO] Fetching persistedQuery SHA (this may take ~10-20s as it runs headless Chrome)...');
  let sha;
  try {
    sha = await getHashToken();
    console.log('[INFO] Obtained SHA:', sha);
  } catch (e) {
    console.error('[ERROR] Failed to get persistedQuery SHA:', e);
    process.exit(1);
  }

  const variables = {
    page: 1,
    tagId: genres[GENRE] || null,
    metaUrl: '/newswire',
    locale: 'en_us'
  };

  const searchParams = new URLSearchParams([
    ['operationName', 'NewswireList'],
    ['variables', JSON.stringify(variables)],
    ['extensions', JSON.stringify({ persistedQuery: { version: 1, sha256Hash: sha } })]
  ]);

  const url = mainLink + searchParams.toString();
  console.log('[INFO] Requesting Graph endpoint:', url);

  let json;
  try {
    json = await fetchGraph(url);
  } catch (e) {
    console.error('[ERROR] Graph request failed:', e);
    process.exit(1);
  }

  if (!json || !json.data || !json.data.posts || !json.data.posts.results) {
    console.log('[INFO] No posts returned by the Graph API.');
    process.exit(0);
  }

  const results = json.data.posts.results;
  console.log('[INFO] Found', results.length, 'results. First result title:', results[0] && results[0].title);

  // For simple testing, print the top item and optionally post to Discord
  const top = results[0];
  const link = 'https://www.rockstargames.com' + (top.url || '');
  const title = top.title || 'No title';
  const preview = (top.preview || top.title || '').substring(0, 1200);

  console.log('--- preview ---');
  console.log('Title:', title);
  console.log('Link :', link);
  console.log('Preview (truncated):', preview);
  console.log('---------------');

  if (DISCORD_WEBHOOK && (FORCE || process.env.GITHUB_EVENT_NAME === 'schedule')) {
    console.log('[INFO] Posting to Discord webhook (forced or scheduled run).');
    const payload = {
      username: 'Rockstar Newswire Tracker (Actions)',
      embeds: [{
        author: { name: 'Rockstar Newswire', url: 'https://www.rockstargames.com/newswire' },
        title: title,
        url: link,
        description: preview,
        color: 16756992
      }]
    };

    try {
      const resp = await new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const u = new URL(DISCORD_WEBHOOK);
        const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
        const req = https.request(u, opts, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
      console.log('[INFO] Discord response:', resp.statusCode, resp.body || '<no body>');
      if (resp.statusCode >= 400) process.exit(1);
    } catch (e) {
      console.error('[ERROR] Failed to post to Discord webhook:', e);
      process.exit(1);
    }
  } else {
    console.log('[INFO] Not posting to Discord (set DISCORD_WEBHOOK and run with FORCE=true to post).');
  }

  process.exit(0);
}

main();
