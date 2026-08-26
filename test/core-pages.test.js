const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

function read(relativePath) {
  return fs.readFileSync(path.join(publicDir, relativePath), 'utf8');
}

test('donation page exposes a two-step flow without a browser-only submission form', () => {
  const html = read('donate.html');
  assert.match(html, /Donate crypto in two steps\./);
  assert.match(html, /id="assetOptions"/);
  assert.match(html, /id="copyStatus"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /Amount sent|Transaction hash|Save locally/);
  assert.doesNotMatch(html, /<script(?![^>]*(?:\bsrc=|type="application\/ld\+json"))/);
});

test('homepage has no synthetic counters or unsupported financial claims', () => {
  const html = read('index.html');
  for (const forbidden of ['128 + days', '$18,460', '45,200', '28,500', '37,300', '$ 12,800']) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
  assert.match(html, /id="verifiedRecords"/);
  assert.doesNotMatch(html, /<script(?![^>]*(?:\bsrc=|type="application\/ld\+json"))/);
});
