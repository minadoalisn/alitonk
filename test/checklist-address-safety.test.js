const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pagePath = '/blog/crypto-donation-safety-checklist-2026.html';
const html = fs.readFileSync(path.join(root, 'public', pagePath), 'utf8');
const plain = value => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));

test('the reviewed checklist never recommends checking only address ends', () => {
  assert.doesNotMatch(html, /verify the first and last characters twice/);
  const answer = schema.find(node => node['@type'] === 'FAQPage').mainEntity
    .find(question => question.name === 'How do I verify a crypto charity donation address?').acceptedAnswer.text;
  assert.match(answer, /every character of the recipient address/);
  assert.match(answer, /including the middle/);
  assert.match(answer, /Matching only the first and last characters is not enough/);
  assert.match(answer, /Never copy a recipient from transaction history/);
  const visible = html.match(/<p id="address-verification-answer">([\s\S]*?)<\/p>/);
  assert.ok(visible, 'Address guidance must be visible, not schema-only');
  assert.equal(plain(visible[1]), answer);
  assert.match(visible[1], /href="\/donate\.html"/);
  assert.match(html, /href="\/donor-safety\.html#full-address-verification"/);
});

test('quick guidance and test-transfer advice stop when verification is unresolved', () => {
  const quick = html.match(/<h2>Quick Answer<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  assert.ok(quick);
  assert.match(plain(quick[1]), /complete recipient address/);
  assert.match(plain(quick[1]), /including the middle characters/);
  assert.match(plain(quick[1]), /Stop if the source, recipient or network is uncertain/);
  assert.doesNotMatch(html, /test transfer when unsure/i);
  assert.match(html, /Only consider a small test after verifying the source, full recipient address, asset and network/);
  assert.match(html, /If any check is unresolved, do not send/);
  assert.match(html, /not who controls it or how funds will be used/);
});

test('scoped address review has primary sources, dates and explicit limits', () => {
  assert.match(html, /href="https:\/\/support\.metamask\.io\/zh-cn\/stay-safe\/protect-yourself\/wallet-and-hardware\/address-poisoning-scams\/"/);
  assert.match(html, /href="https:\/\/info\.etherscan\.com\/what-is-address-poisoning\/"/);
  assert.match(html, /MetaMask publication date: unknown/);
  assert.match(html, /Etherscan published: January 15, 2024/);
  assert.match(html, /Both sources accessed October 30, 2026/);
  assert.match(html, /Maintained by: ALI Charity Operations/);
  assert.match(html, /AI-assisted source comparison, not an on-chain audit/);
  assert.match(html, /not a reported ALI Charity incident/);
  assert.match(html, /Other sections were not re-reviewed/);
});

test('only the changed checklist receives the new modification date', () => {
  const article = schema.find(node => node['@type'] === 'Article');
  const checked = html.match(/Address-check guidance reviewed: <time datetime="(\d{4}-\d{2}-\d{2})">/);
  assert.ok(checked, 'Missing the visible scoped review date');
  assert.equal(article.datePublished, '2026-05-17');
  assert.equal(article.dateModified, checked[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/geo-authority.json'), 'utf8'));
  assert.equal(manifest.pages.find(page => page.path === pagePath).lastModified, checked[1]);
  assert.equal(manifest.pages.find(page => page.path === '/donor-safety.html').lastModified, '2026-10-29');
  assert.equal(manifest.feed.lastModified, '2026-08-27', 'An article edit is not a new collection review');
});
