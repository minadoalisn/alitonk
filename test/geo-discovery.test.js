const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifest = require('../config/geo-authority.json');
const { assessPage, crawlerAllowed, renderFeed, renderSitemap } = require('../scripts/lib/geo-discovery');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

test('all mainstream AI search crawlers have an explicit allow group', () => {
  const robots = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8');
  for (const agent of manifest.aiSearchCrawlers) assert.equal(crawlerAllowed(robots, agent), true, agent);
});

test('AI answer hub is citation-ready and linked from machine-readable indexes', () => {
  const html = fs.readFileSync(path.join(publicDir, 'answers.html'), 'utf8');
  const result = assessPage(html, 'https://minadoai.com/answers.html');
  assert.equal(result.score, 100, JSON.stringify(result));
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  const llms = fs.readFileSync(path.join(publicDir, 'llms.txt'), 'utf8');
  assert.match(llms, /\[Verified answers about ALI Charity\]\(https:\/\/minadoai\.com\/answers\.html\)/);
});

test('sitemap and feed are generated only from reviewed authority entries', () => {
  const sitemap = renderSitemap(manifest);
  assert.match(sitemap, /https:\/\/minadoai\.com\/answers\.html/);
  assert.doesNotMatch(sitemap, /ali-token-dex-launch-preparation/);
  const feed = renderFeed(manifest, [{ title: 'Guide', url: 'https://minadoai.com/blog/guide.html', description: 'Evidence-led guide', updated: '2026-08-27' }], '2026-08-27');
  assert.match(feed, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/);
  assert.match(feed, /<entry>/);
});

test('every non-authority HTML page is excluded from indexing', () => {
  const reviewed = new Set(manifest.pages.map(page => page.path === '/' ? 'index.html' : page.path.replace(/^\//, '').replace(/\/$/, '/index.html')));
  const utilityFiles = new Set(['google6f5c8e7b3f5f8c1a.html']);
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
  for (const file of walk(publicDir).filter(file => file.endsWith('.html'))) {
    const relative = path.relative(publicDir, file).split(path.sep).join('/');
    if (reviewed.has(relative) || utilityFiles.has(relative) || relative.startsWith('blog/briefings/')) continue;
    assert.match(fs.readFileSync(file, 'utf8'), /<meta name="robots" content="noindex, nofollow, noarchive">/, relative);
  }
});
