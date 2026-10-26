const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const publicDir = path.join(__dirname, '..', 'public');
const read = name => fs.readFileSync(path.join(publicDir, name), 'utf8');
const plain = html => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function guidance(name) {
  const html = read(name);
  const section = html.match(/<section\b[^>]*aria-labelledby="faq-(?:heading|title)"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(section, `${name}: missing visible FAQ`);
  const visible = new Map([...section[1].matchAll(/<(summary|h3)\b[^>]*>([\s\S]*?)<\/\1>\s*<p>([\s\S]*?)<\/p>/g)]
    .map(match => [plain(match[2]), plain(match[3])]));
  const nodes = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap(match => { const data = JSON.parse(match[1]); return data['@graph'] || [data]; });
  const faq = nodes.find(node => node['@type'] === 'FAQPage');
  assert.ok(faq, `${name}: missing FAQ schema`);
  return { html, visible, faq };
}

for (const name of ['donate.html', 'giving-tuesday.html']) {
  test(`${name}: structured answers match all published visible answers`, () => {
    const { visible, faq } = guidance(name);
    assert.equal(visible.size, name === 'giving-tuesday.html' ? 6 : 5);
    assert.equal(faq.mainEntity.length, visible.size);
    for (const question of faq.mainEntity) {
      assert.equal(question.acceptedAnswer.text, visible.get(question.name), question.name);
    }
  });

  test(`${name}: no wallet connection is not represented as a safety guarantee`, () => {
    const answer = guidance(name).visible.get('Is it safe to donate crypto to ALI Charity?');
    assert.match(answer, /not a safety guarantee/);
    assert.match(answer, /do not send/i);
    assert.doesNotMatch(answer, /^Yes\b/);
  });

  test(`${name}: asset guidance reflects the actual configured networks`, () => {
    const { html, visible } = guidance(name);
    const context = { window: {} };
    vm.runInNewContext(read('js/site-config.js'), context);
    const routes = context.window.ALI_SITE_CONFIG.donations;
    for (const asset of ['USDT', 'BNB', 'ETH']) assert.equal(routes[asset].network, 'BSC');
    assert.equal(routes.BTC.network, 'Bitcoin');
    assert.equal(routes.SOL.network, 'Solana');
    assert.match(visible.get('Which cryptocurrencies do you accept?'), /USDT, BNB and ETH on BNB Smart Chain \(BSC\), BTC on Bitcoin, and SOL on Solana/);
    assert.match(visible.get('Which cryptocurrencies do you accept?'), /ETH here is not Ethereum mainnet/);
    const verification = visible.get('How do I verify my donation arrived?');
    for (const check of ['network-specific explorer', 'BscScan', 'confirmation', 'recipient', 'asset or token', 'amount', 'network']) {
      assert.ok(verification.includes(check), `Missing check: ${check}`);
    }
    assert.doesNotMatch(html, /Etherscan|etherscan\.io|any blockchain explorer|any explorer/);
  });

  test(`${name}: transferring does not promise automatic publication or a receipt`, () => {
    const { html, visible } = guidance(name);
    const answer = visible.get('What happens after I donate?');
    assert.match(answer, /does not automatically record transfers, verify receipt or issue a tax receipt/);
    assert.match(answer, /may be absent from the published records/);
    assert.match(answer, /unknown, not zero/);
    assert.doesNotMatch(html, /Your transfer appears in (?:our )?public records/);
  });

  test(`${name}: tax eligibility stays unverified and links to official checking sources`, () => {
    const { html, visible } = guidance(name);
    assert.match(visible.get('Is my crypto donation tax-deductible?'), /eligibility to receive tax-deductible contributions is unverified/);
    assert.match(visible.get('Is my crypto donation tax-deductible?'), /Do not assume a deduction/);
    assert.doesNotMatch(html, /tax-efficient/);
    for (const url of ['https://www.irs.gov/publications/p526', 'https://www.irs.gov/charities-non-profits/tax-exempt-organization-search']) {
      assert.ok(html.includes(`href="${url}"`), `Missing official source: ${url}`);
    }
  });
}

test('campaign keeps a sourced event date without unsupported financial momentum claims', () => {
  const html = read('giving-tuesday.html');
  assert.match(html, /December 1, 2026/);
  assert.match(html, /href="https:\/\/www\.givingtuesday\.org\/participate\/"/);
  assert.doesNotMatch(html, /\$100 million|\$11,000|Nearly 30%|biggest crypto giving day|single biggest day/);
  assert.match(html, /ALI Charity campaign totals are unknown, not zero/);
  assert.match(html, /not evidence of a partnership or endorsement/);
  for (const link of ['/donate.html#donation', '/transparency.html', '/donor-safety.html']) {
    assert.ok(html.includes(`href="${link}"`));
  }
});

test('the discovery manifest uses the latest scoped guidance review date', () => {
  const manifest = require('../config/geo-authority.json');
  for (const name of ['donate.html', 'giving-tuesday.html']) {
    const html = read(name);
    const reviewed = html.match(/Guidance checked: <time datetime="(\d{4}-\d{2}-\d{2})">/);
    assert.ok(reviewed, `${name}: missing scoped review date`);
    const regulatoryReview = html.match(/Regulatory note checked: <time datetime="(\d{4}-\d{2}-\d{2})">/);
    const latestReview = [reviewed[1], regulatoryReview?.[1]].filter(Boolean).sort().at(-1);
    assert.equal(manifest.pages.find(page => page.path === `/${name}`).lastModified, latestReview);
    assert.match(html, /content-consistency check, not an on-chain audit/);
    assert.match(html, /Source publication dates: unknown/);
  }
});

test('the retained stablecoin FAQ distinguishes rule publication from donation safety and approval', () => {
  const { html, visible } = guidance('giving-tuesday.html');
  const answer = visible.get('Is USDT safe to donate under U.S. regulation?');
  assert.ok(answer, 'Preserve the newly published question');
  assert.match(answer, /^Not by itself\./);
  assert.match(answer, /October 21, 2026/);
  assert.match(answer, /effective January 18, 2027/);
  assert.match(answer, /after GivingTuesday 2026/);
  assert.match(answer, /issuers within the OCC's jurisdiction/);
  assert.match(answer, /not a safety guarantee for this donation/);
  assert.match(answer, /USDT's regulatory status and the status of the exact token on your selected network remain unverified here/);
  assert.match(answer, /Do not infer approval of ALI Charity or tax deductibility/);
  assert.match(answer, /if you cannot, do not send/);
  assert.doesNotMatch(html, /first Giving Tuesday under a finalized federal stablecoin rulebook/);
});

test('the regulatory note has primary sources and separates publication, effective and review dates', () => {
  const html = read('giving-tuesday.html');
  assert.ok(html.includes('href="https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-50.html"'), 'Missing OCC bulletin');
  assert.ok(html.includes('href="https://www.govinfo.gov/content/pkg/FR-2026-10-23/html/2026-21706.htm"'), 'Missing official Federal Register text');
  assert.match(html, /OCC announcement: October 21, 2026/);
  assert.match(html, /Federal Register publication: October 23, 2026/);
  assert.match(html, /Rule effective date: January 18, 2027/);
  assert.match(html, /Regulatory note checked: <time datetime="2026-10-26">/);
  assert.match(html, /Guidance checked: <time datetime="2026-10-23">/);
  assert.match(html, /not an issuer-approval check or legal advice/);
});
