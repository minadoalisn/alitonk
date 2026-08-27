const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../config/geo-authority.json');
const { fileForPage, metaContent, pageUrl, renderFeed, tagText } = require('./lib/geo-discovery');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const generatedAt = process.env.GEO_RUN_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());

function itemFor(page) {
  const file = fileForPage(publicDir, page.path);
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  return {
    title: tagText(html, 'title'),
    url: pageUrl(manifest.site.baseUrl, page.path),
    description: metaContent(html, 'description'),
    updated: page.lastModified
  };
}

const items = manifest.pages.filter(page => page.feed).map(itemFor).filter(item => item && item.title && item.description);
fs.writeFileSync(path.join(publicDir, 'feed.xml'), renderFeed(manifest, items, generatedAt));
console.log(`Generated Atom feed with ${items.length} reviewed entries.`);
