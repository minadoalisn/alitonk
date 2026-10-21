const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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
  const feed = renderFeed(manifest, [{ title: 'Guide', url: 'https://minadoai.com/blog/guide.html', description: 'Evidence-led guide', updated: '2026-08-27' }]);
  assert.match(feed, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/);
  assert.match(feed, /<entry>/);
});

const feedManifest = { ...manifest, feed: { lastModified: '2026-08-27' } };
const feedItem = { title: 'Guide', url: 'https://minadoai.com/blog/guide.html', description: 'Evidence-led guide', updated: '2026-05-17' };
const collectionUpdated = xml => xml.match(/<updated>([^<]+)<\/updated>/)[1];

test('feed freshness uses reviewed collection metadata, not the build date', () => {
  const xml = renderFeed(feedManifest, [feedItem], '2026-10-21');
  assert.equal(collectionUpdated(xml), '2026-08-27T00:00:00Z');
  assert.match(xml, /<entry>[\s\S]*<updated>2026-05-17T00:00:00Z<\/updated>/);
});

test('feed freshness advances for the newest included entry regardless of order', () => {
  const newer = { ...feedItem, updated: '2026-09-01' };
  for (const items of [[newer, feedItem], [feedItem, newer]]) {
    assert.equal(collectionUpdated(renderFeed(feedManifest, items)), '2026-09-01T00:00:00Z');
  }
});

test('an explicit collection revision records metadata edits or removals, even for an empty feed', () => {
  const revised = { ...feedManifest, feed: { lastModified: '2026-09-02' } };
  for (const items of [[feedItem], []]) {
    assert.equal(collectionUpdated(renderFeed(revised, items)), '2026-09-02T00:00:00Z');
  }
});

test('feed generation rejects missing or invalid evidence dates instead of inventing freshness', () => {
  for (const value of [undefined, '', '2026-02-30', '2026-13-01', 'today', '2026-08-27T00:00:00Z']) {
    assert.throws(() => renderFeed({ ...feedManifest, feed: { lastModified: value } }, [feedItem]), /feed\.lastModified.*YYYY-MM-DD/);
    assert.throws(() => renderFeed(feedManifest, [{ ...feedItem, updated: value }]), /entry\.updated.*YYYY-MM-DD/);
  }
  assert.throws(() => renderFeed({ ...feedManifest, feed: undefined }, []), /feed\.lastModified.*YYYY-MM-DD/);
  assert.equal(collectionUpdated(renderFeed(feedManifest, [{ ...feedItem, updated: '2028-02-29' }])), '2028-02-29T00:00:00Z');
});

test('the feed command is stable across run dates and ignores unrelated page revisions', t => {
  const temporaryRoot = path.resolve(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(temporaryRoot, 'ali-feed-freshness-'));
  t.after(() => {
    assert.equal(path.dirname(fixture), temporaryRoot);
    assert.ok(path.basename(fixture).startsWith('ali-feed-freshness-'));
    fs.rmSync(fixture, { recursive: true, force: true });
  });
  for (const name of ['scripts/generate-feed.js', 'scripts/lib/geo-discovery.js']) {
    const destination = path.join(fixture, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, name), destination);
  }
  fs.mkdirSync(path.join(fixture, 'config'));
  fs.mkdirSync(path.join(fixture, 'public'));
  fs.writeFileSync(path.join(fixture, 'public/guide.html'), '<title>Reviewed guide</title><meta name="description" content="Evidence-led guide">');
  const data = {
    ...feedManifest,
    pages: [
      { path: '/guide.html', feed: true, lastModified: '2026-05-17' },
      { path: '/', lastModified: '2050-12-31' }
    ]
  };
  fs.writeFileSync(path.join(fixture, 'config/geo-authority.json'), JSON.stringify(data));
  const run = runDate => {
    execFileSync(process.execPath, [path.join(fixture, 'scripts/generate-feed.js')], {
      env: { ...process.env, GEO_RUN_DATE: runDate }, encoding: 'utf8'
    });
    return fs.readFileSync(path.join(fixture, 'public/feed.xml'), 'utf8');
  };
  const first = run('2026-10-21');
  assert.equal(collectionUpdated(first), '2026-08-27T00:00:00Z');
  assert.equal(run('2050-12-31'), first);
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
