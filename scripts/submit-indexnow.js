const fs = require('fs');
const https = require('https');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BASE_URL = process.env.BLOG_BASE_URL || 'https://minadoai.com';
const HOST = new URL(BASE_URL).hostname;
const KEY = process.env.INDEXNOW_KEY || '';
const KEY_LOCATION = `${BASE_URL.replace(/\/$/, '')}/${KEY}.txt`;
const DEFAULT_URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/donate.html`,
  `${BASE_URL}/donor-safety.html`,
  `${BASE_URL}/promotion.html`,
  `${BASE_URL}/blog/`,
  `${BASE_URL}/blog/crypto-donation-safety-checklist-2026.html`
];

function sitemapUrls() {
  const files = ['sitemap.xml', path.join('blog', 'sitemap.xml')];
  const urls = new Set(DEFAULT_URLS);

  for (const file of files) {
    const full = path.join(PUBLIC_DIR, file);
    if (!fs.existsSync(full)) continue;
    const xml = fs.readFileSync(full, 'utf8');
    for (const match of xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)) {
      urls.add(match[1]);
    }
  }

  return Array.from(urls).slice(0, 10000);
}

function ensureKeyFile() {
  if (!KEY) return null;
  const outFile = path.join(PUBLIC_DIR, `${KEY}.txt`);
  if (!fs.existsSync(outFile) || fs.readFileSync(outFile, 'utf8').trim() !== KEY) {
    fs.writeFileSync(outFile, `${KEY}\n`);
  }
  return outFile;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const endpoint = new URL(url);
    const req = https.request({
      hostname: endpoint.hostname,
      path: endpoint.pathname + endpoint.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'ALI-Charity-IndexNow/1.0'
      },
      timeout: 30000
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: responseBody }));
    });
    req.on('timeout', () => req.destroy(new Error(`Timed out posting ${url}`)));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!KEY) {
    console.log('INDEXNOW_KEY is not set. Skipping submission.');
    console.log('Set INDEXNOW_KEY in the deployment environment, run npm run build to publish the key file, then rerun this script.');
    return;
  }

  const keyFile = ensureKeyFile();
  const urlList = sitemapUrls();
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList
  };

  console.log(`Prepared IndexNow key file: ${path.relative(ROOT, keyFile)}`);
  console.log(`Submitting ${urlList.length} URLs for ${HOST}.`);

  const result = await postJson('https://api.indexnow.org/indexnow', body);
  console.log(`IndexNow response: ${result.statusCode}`);
  if (result.body) console.log(result.body.slice(0, 500));

  if (![200, 202].includes(result.statusCode)) {
    throw new Error(`IndexNow submission failed with status ${result.statusCode}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
