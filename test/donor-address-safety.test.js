const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/donor-safety.html'), 'utf8');
const plain = value => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));
const addressAnswer = schema.find(node => node['@type'] === 'FAQPage').mainEntity
  .find(question => question.name === 'How should I verify an ALI Charity crypto donation address?')
  .acceptedAnswer.text;

test('donor safety requires the complete address, including its middle, before sending', () => {
  assert.match(addressAnswer, /entire recipient address/);
  assert.match(addressAnswer, /every middle character/);
  assert.match(addressAnswer, /Matching only the first and last characters is not enough/);
  assert.match(addressAnswer, /Never copy a recipient from transaction history/);
  assert.match(addressAnswer, /Stop if the source, address or network is uncertain/);
  assert.doesNotMatch(html, /compare the first and last characters of the address, and keep/);
});

test('the structured address answer is also visible with a working Donate link', () => {
  const paragraph = html.match(/<p id="full-address-answer">([\s\S]*?)<\/p>/);
  assert.ok(paragraph, 'Missing visible full-address verification guidance');
  assert.equal(plain(paragraph[1]), addressAnswer);
  assert.match(paragraph[1], /href="\/donate\.html"/);
  assert.match(html, /href="#full-address-verification"/);
  assert.match(html, /<section id="full-address-verification" aria-labelledby="full-address-heading">/);
  assert.match(html, /does not verify who controls the wallet or prove a charitable use of funds/);
});

test('address guidance cites official sources without inventing dates or an audit', () => {
  assert.match(html, /href="https:\/\/support\.metamask\.io\/zh-cn\/stay-safe\/protect-yourself\/wallet-and-hardware\/address-poisoning-scams\/"/);
  assert.match(html, /href="https:\/\/info\.etherscan\.com\/what-is-address-poisoning\/"/);
  assert.match(html, /MetaMask publication date: unknown/);
  assert.match(html, /Etherscan published: January 15, 2024/);
  assert.match(html, /ongoing risk, not a reported ALI Charity incident/);
  assert.match(html, /not an on-chain audit/);
});

test('page modification metadata stays consistent without refreshing scoped factual reviews', () => {
  const checked = html.match(/Address-check guidance checked: <time datetime="(\d{4}-\d{2}-\d{2})">/);
  assert.ok(checked, 'Missing scoped address guidance review date');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/geo-authority.json'), 'utf8'));
  const modified = schema.find(node => node['@type'] === 'WebPage').dateModified;
  assert.match(modified, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(manifest.pages.find(page => page.path === '/donor-safety.html').lastModified, modified);
  assert.ok(modified >= checked[1], 'A page edit cannot predate its scoped factual review');
  assert.equal(checked[1], '2026-10-25', 'A navigation fix must not claim a new address-guidance review');
  assert.match(html, /<strong>Last reviewed:<\/strong> August 15, 2026/);
  assert.match(html, /All three were accessed August 15, 2026/);
});

test('the new verification anchor leaves room for the sticky navigation', () => {
  assert.match(html, /#full-address-verification\s*\{\s*scroll-margin-top:\s*80px;\s*\}/);
  assert.match(html, /@media\s*\(max-width:\s*860px\)[\s\S]*#full-address-verification\s*\{\s*scroll-margin-top:\s*180px;\s*\}/);
});
