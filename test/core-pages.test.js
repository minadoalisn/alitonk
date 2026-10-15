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

test('donors can review evidence limits before choosing an asset or copying an address', () => {
  const html = read('donate.html');
  const checkpoint = html.match(/<aside\b[^>]*aria-labelledby="before-donating-title"[^>]*>([\s\S]*?)<\/aside>/);
  assert.ok(checkpoint, 'A visible evidence checkpoint must be present');
  assert.ok(checkpoint.index < html.indexOf('id="assetOptions"'), 'Evidence must precede asset selection');
  assert.ok(checkpoint.index < html.indexOf('id="copyAddress"'), 'Evidence must precede address copying');
  assert.match(checkpoint[1], /<h2 id="before-donating-title">Before you donate<\/h2>/);
  for (const target of ['/transparency.html', '/answers.html', '/donor-safety.html']) {
    assert.ok(checkpoint[1].includes(`href="${target}"`), `Missing evidence link: ${target}`);
    assert.ok(fs.existsSync(path.join(publicDir, target.slice(1))), `Missing link target: ${target}`);
  }
  assert.match(checkpoint[1], /not proof of legal status, off-chain spending, an independent audit, or beneficiary impact/);
  assert.match(checkpoint[1], /unsupported claims as unverified/);
  assert.match(checkpoint[1], /do not send/);
  assert.doesNotMatch(checkpoint[1], /<script|<form|0x[a-fA-F0-9]{40}/);
});

test('homepage has no synthetic counters or unsupported financial claims', () => {
  const html = read('index.html');
  for (const forbidden of ['128 + days', '$18,460', '45,200', '28,500', '37,300', '$ 12,800']) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
  assert.match(html, /id="verifiedRecords"/);
  assert.doesNotMatch(html, /<script(?![^>]*(?:\bsrc=|type="application\/ld\+json"))/);
});
