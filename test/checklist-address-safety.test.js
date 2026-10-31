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

test('the checklist modification date follows its latest scoped review', () => {
  const article = schema.find(node => node['@type'] === 'Article');
  const checked = html.match(/Address-check guidance reviewed: <time datetime="(\d{4}-\d{2}-\d{2})">/);
  assert.ok(checked, 'Missing the visible scoped review date');
  const reviewDates = [...html.matchAll(/guidance reviewed: <time datetime="(\d{4}-\d{2}-\d{2})">/g)]
    .map(match => match[1]).sort();
  assert.equal(article.datePublished, '2026-05-17');
  assert.equal(checked[1], '2026-10-30', 'Do not refresh an unchanged address review');
  assert.equal(article.dateModified, reviewDates.at(-1));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/geo-authority.json'), 'utf8'));
  assert.equal(manifest.pages.find(page => page.path === pagePath).lastModified, article.dateModified);
  assert.equal(manifest.pages.find(page => page.path === '/donor-safety.html').lastModified, '2026-10-29');
  assert.equal(manifest.feed.lastModified, '2026-08-27', 'An article edit is not a new collection review');
});

test('the checklist does not describe a transaction hash as a donation receipt', () => {
  assert.doesNotMatch(html, /keep the transaction hash as your receipt/i);
  assert.doesNotMatch(html, /tax-ready proof/i);
  const answer = schema.find(node => node['@type'] === 'FAQPage').mainEntity
    .find(question => question.name === 'What proof should I keep after donating crypto?').acceptedAnswer.text;
  assert.match(answer, /A hash alone does not prove receipt/);
  assert.match(answer, /lookup reference, not a donation receipt/);
  assert.match(answer, /does not establish charitable use, impact or tax eligibility/);
});

test('every retained structured answer is also visible under its question', () => {
  const visible = [...html.matchAll(/<h2(?:\s[^>]*)?>([^<]+)<\/h2>\s*<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)]
    .map(match => [plain(match[1]).replace(/^\d+\.\s*/, ''), plain(match[2])]);
  for (const question of schema.find(node => node['@type'] === 'FAQPage').mainEntity) {
    const paragraph = visible.find(([heading]) => heading === question.name);
    assert.ok(paragraph, `No visible answer for ${question.name}`);
    assert.equal(paragraph[1], question.acceptedAnswer.text);
  }
});

test('record-keeping guidance preserves evidence and separates it from confirmed donations', () => {
  const section = html.match(/<h2 id="proof-records">([\s\S]*?)<h2>/);
  assert.ok(section, 'Missing the record-keeping section');
  for (const field of ['full transaction hash', 'explorer URL', 'sender and recipient addresses', 'asset or token', 'exact amount', 'network', 'timestamp', 'status']) {
    assert.ok(section[1].includes(field), `Missing evidence field: ${field}`);
  }
  assert.match(section[1], /Pending or failed transfers are not confirmed donations/);
  assert.match(section[1], /does not automatically record transfers, verify receipt or issue a tax receipt/);
  assert.match(section[1], /Unknown totals remain unknown, not zero/);
  assert.match(section[1], /href="\/donate\.html"/);
  assert.match(section[1], /href="\/transparency\.html"/);
  assert.match(section[1], /Save a dated copy of the donation page for your private records/);
});

test('record-keeping review has primary sources, jurisdiction limits and a separate date', () => {
  assert.match(html, /Record-keeping guidance reviewed: <time datetime="2026-10-31">/);
  assert.match(html, /href="https:\/\/ethereum\.org\/developers\/docs\/transactions\/"/);
  assert.match(html, /href="https:\/\/www\.irs\.gov\/charities-non-profits\/charitable-organizations\/charitable-contributions-written-acknowledgments"/);
  assert.match(html, /Ethereum page last updated October 7, 2026/);
  assert.match(html, /Original publication dates: unknown/);
  assert.match(html, /Both sources accessed October 31, 2026/);
  assert.match(html, /eligibility to receive tax-deductible contributions remains unverified/);
  assert.match(html, /US-specific acknowledgment requirements are not a global rule/);
  assert.match(html, /not a verification of any donation or legal status/);
});
