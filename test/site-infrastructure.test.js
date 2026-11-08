const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const { config, retired } = require('../scripts/write-vercel-config');
const { applyLayout } = require('../scripts/apply-layout');
const { loadSiteConfig, networkSlug } = require('../scripts/lib/site-config');

function htmlFiles(dir = publicDir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(absolute);
    return entry.name.endsWith('.html') ? [path.relative(publicDir, absolute).split(path.sep).join('/')] : [];
  });
}

test('committed vercel.json matches the generator (run npm run vercel:config after edits)', () => {
  const committed = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.deepEqual(committed, JSON.parse(JSON.stringify(config)));
});

test('every retired URL redirects to a page that exists, and no retired page still ships', () => {
  for (const [source, destination] of Object.entries(retired)) {
    const target = destination === '/' ? 'index.html' : destination.replace(/^\//, '').replace(/\/$/, '/index.html');
    assert.ok(fs.existsSync(path.join(publicDir, target)), `${source} -> missing ${destination}`);
    if (source.endsWith('.html')) assert.ok(!fs.existsSync(path.join(publicDir, source.slice(1))), `${source} still exists`);
  }
});

test('security headers include HSTS and a CSP that allows only self-hosted and declared scripts', () => {
  const headers = config.headers.find(rule => rule.source === '/(.*)').headers;
  const csp = headers.find(header => header.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self' https:\/\/geoinflow-iota\.vercel\.app https:\/\/va\.vercel-scripts\.com(;|$)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.ok(headers.some(header => header.key === 'Strict-Transport-Security'));
});

test('no page ships inline scripts, the Tailwind play CDN, or retired stylesheets', () => {
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.doesNotMatch(html, /<script(?![^>]*(?:\bsrc=|type="application\/ld\+json"))[^>]*>/, `${file} has an inline script (blocked by CSP)`);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com|css\/(home|site-polish|blog-index)\.css/, file);
  }
});

test('every page uses the shared layout and the layout is already applied', () => {
  for (const file of htmlFiles().filter(file => file !== 'google6f5c8e7b3f5f8c1a.html')) {
    const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
    for (const region of ['head', 'header', 'footer', 'analytics']) {
      assert.ok(html.includes(`<!-- layout:${region} -->`), `${file} is missing layout:${region}`);
    }
    assert.equal(applyLayout(html, file), html, `${file} is stale: run npm run layout`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file} must have exactly one h1`);
  }
});

test('a QR code exists for every donation network in the canonical config', () => {
  for (const { network } of Object.values(loadSiteConfig().donations)) {
    assert.ok(fs.existsSync(path.join(publicDir, 'assets', 'qr', `${networkSlug(network)}.svg`)), network);
  }
});

test('internal planning documents are not published', () => {
  const published = fs.readdirSync(publicDir).concat(fs.readdirSync(path.join(publicDir, 'blog')));
  for (const name of published) assert.doesNotMatch(name, /\.md$|keywords\.txt|strategy|execution-plan|security-fix/i, name);
});

test('the Chinese overview and English homepage declare reciprocal hreflang alternates', () => {
  const en = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const zh = fs.readFileSync(path.join(publicDir, 'zh', 'index.html'), 'utf8');
  assert.match(en, /hreflang="zh-Hans" href="https:\/\/minadoai\.com\/zh\/"/);
  assert.match(zh, /hreflang="en" href="https:\/\/minadoai\.com\/"/);
  assert.match(zh, /<html lang="zh-Hans">/);
});
