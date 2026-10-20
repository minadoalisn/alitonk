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

test('homepage explains the evidence gate and loads canonical routing before the record summary', () => {
  const html = read('index.html');
  const configIndex = html.indexOf('<script src="/js/site-config.js">');
  assert.ok(configIndex > 0 && configIndex < html.indexOf('<script src="/js/public-records.js">'));
  assert.match(html, /complete transaction evidence/);
  assert.match(html, /reporting period/);
  assert.match(html, /Unknown does not mean zero/);
  const script = read('js/home.js');
  assert.match(script, /ALI_SITE_CONFIG/);
  assert.match(script, /data\.reportingPeriod/);
  assert.match(script, /Actual donation totals are unknown/);
  assert.doesNotMatch(script, /verified public donation record/);
});

test('transparency discloses retained unverified records instead of promising confirmed-only data', () => {
  const html = read('transparency.html');
  const data = JSON.parse(read('data/donations.json'));
  assert.equal(data.statisticsStatus, 'unverified');
  assert.ok(data.donations.some(record => record.status === 'unverified'));
  assert.doesNotMatch(html, /Confirmed transaction identifiers only|never placeholders or pending submissions/);
  const status = html.match(/<section\b[^>]*aria-labelledby="record-status-title"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(status, 'The retained unverified data needs a visible status explanation');
  assert.match(status[1], /<h2 id="record-status-title">/);
  assert.match(status[1], /unverified/);
  assert.match(status[1], /null/);
  assert.match(status[1], /unknown, not zero/);
  assert.match(status[1], /historical values are unverified source claims/);
  assert.match(status[1], /not an on-chain audit/);
  assert.match(status[1], /Address copies, button clicks, and submitted hashes are not proof of receipt/);
  for (const target of ['/data/donations.json', '/#proof']) {
    assert.ok(status[1].includes(`href="${target}"`), `Missing supporting link: ${target}`);
  }
  assert.match(read('index.html'), /id="proof"/);
  const reviewedDate = status[1].match(/<time datetime="(\d{4}-\d{2}-\d{2})">/)?.[1];
  assert.ok(reviewedDate, 'The file check must have a visible dated scope');
  assert.ok(html.includes(`"dateModified":"${reviewedDate}"`));
  const manifest = require('../config/geo-authority.json');
  assert.equal(manifest.pages.find(page => page.path === '/transparency.html').lastModified, reviewedDate);
});
