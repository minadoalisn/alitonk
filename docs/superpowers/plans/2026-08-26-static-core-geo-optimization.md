# ALI Charity Static Core and GEO Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a trustworthy static ALI Charity site with a two-step donation flow, verifiable public data, a smaller accessible homepage, and a quality-gated GEO publishing pipeline.

**Architecture:** Keep `public/` as the deployable artifact and use dependency-free browser JavaScript plus Node's built-in test runner. Pure CommonJS-compatible modules hold donation, public-record, static-validation, and promotion logic; page scripts only bind those functions to the DOM. Render and Netlify remain static hosts, while the root Node server becomes a local read-only preview server.

**Tech Stack:** HTML5, CSS, browser JavaScript, Node.js 18+, `node:test`, Render static sites, Netlify static hosting, GitHub Actions.

## Global Constraints

- Preserve `https://minadoai.com/`, `/donate.html`, `/donor-safety.html`, `/about.html`, `/blog/`, and existing canonical article URLs.
- Keep `public/js/site-config.js` as the only donation-address source.
- Do not connect wallets, request signatures, execute transfers, handle private keys, create liquidity, or imply investment returns.
- Do not display synthetic donation, project, expenditure, or token-distribution totals.
- Do not publish a promotion article when sources or uniqueness checks fail.
- Use failing tests before production-code changes and run the complete verification gate before release.

---

### Task 1: Establish Tested Donation and Public-Record Domain Modules

**Files:**
- Create: `test/donation-flow.test.js`
- Create: `test/public-records.test.js`
- Create: `public/js/donation-flow.js`
- Create: `public/js/public-records.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: the `window.ALI_SITE_CONFIG.donations` object.
- Produces: `getDonationView(config, symbol)`, `explorerUrl(symbol, address)`, `isVerifiedRecord(record)`, and `summarizeVerifiedRecords(records)`.

- [ ] **Step 1: Write failing donation-view tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { getDonationView, explorerUrl } = require('../public/js/donation-flow');

const config = {
  USDT: { network: 'BSC', address: '0xabc1234567890123456789012345678901234567' },
  BTC: { network: 'Bitcoin', address: 'bc1ptestaddress1234567890' }
};

test('defaults to USDT and returns network-specific safety copy', () => {
  const view = getDonationView(config);
  assert.equal(view.symbol, 'USDT');
  assert.match(view.safetyText, /BNB Smart Chain/);
});

test('BTC selection uses a Bitcoin explorer and Bitcoin safety copy', () => {
  const view = getDonationView(config, 'BTC');
  assert.equal(view.network, 'Bitcoin');
  assert.match(view.safetyText, /Bitcoin network/);
  assert.equal(explorerUrl('BTC', view.address), `https://mempool.space/address/${view.address}`);
});

test('missing address fails closed', () => {
  assert.throws(() => getDonationView({}, 'USDT'), /unavailable/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/donation-flow.test.js`

Expected: FAIL because `public/js/donation-flow.js` does not exist.

- [ ] **Step 3: Implement the minimal donation module**

```js
(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ALI_DONATION_FLOW = api;
})(typeof globalThis === 'object' ? globalThis : this, function createDonationFlow() {
  const SAFETY = {
    BSC: 'Send only on BNB Smart Chain. A wrong network can permanently lose funds.',
    Bitcoin: 'Send BTC only on the Bitcoin network. Check the full address before sending.',
    Solana: 'Send SOL only on Solana. Check the full address before sending.'
  };

  function explorerUrl(symbol, address) {
    if (symbol === 'BTC') return `https://mempool.space/address/${encodeURIComponent(address)}`;
    if (symbol === 'SOL') return `https://solscan.io/account/${encodeURIComponent(address)}`;
    return `https://bscscan.com/address/${encodeURIComponent(address)}`;
  }

  function getDonationView(config, requestedSymbol = 'USDT') {
    const symbol = String(requestedSymbol || 'USDT').toUpperCase();
    const asset = config && config[symbol];
    if (!asset || !asset.address || !asset.network) throw new Error('Donation address unavailable');
    return {
      symbol,
      network: asset.network,
      address: asset.address,
      safetyText: SAFETY[asset.network] || `Send only on ${asset.network}.`,
      explorerUrl: explorerUrl(symbol, asset.address)
    };
  }

  return { explorerUrl, getDonationView };
});
```

- [ ] **Step 4: Run donation tests and verify GREEN**

Run: `node --test test/donation-flow.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Write failing public-record tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { isVerifiedRecord, summarizeVerifiedRecords } = require('../public/js/public-records');

test('rejects placeholder and pending records', () => {
  assert.equal(isVerifiedRecord({ status: 'confirmed', amount: '0.3', currency: 'USDT', txHash: '0x1234...5678' }), false);
  assert.equal(isVerifiedRecord({ status: 'pending', amount: '5', currency: 'USDT', txHash: '0xabcdef123456' }), false);
});

test('summarizes only supported confirmed records without currency conversion', () => {
  const summary = summarizeVerifiedRecords([
    { status: 'confirmed', amount: '2.5', currency: 'USDT', txHash: '0xabcdef123456' },
    { status: 'confirmed', amount: '0.01', currency: 'BTC', txHash: 'abcdef1234567890' }
  ]);
  assert.equal(summary.count, 2);
  assert.deepEqual(summary.amounts, { BTC: 0.01, USDT: 2.5 });
});
```

- [ ] **Step 6: Run public-record tests and verify RED**

Run: `node --test test/public-records.test.js`

Expected: FAIL because `public/js/public-records.js` does not exist.

- [ ] **Step 7: Implement public-record filtering and summaries**

```js
(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ALI_PUBLIC_RECORDS = api;
})(typeof globalThis === 'object' ? globalThis : this, function createPublicRecords() {
  const SUPPORTED = new Set(['USDT', 'ETH', 'BNB', 'BTC', 'SOL', 'ALI']);

  function isVerifiedRecord(record) {
    const amount = Number(record && record.amount);
    const txHash = String(record && record.txHash || '').trim();
    return String(record && record.status).toLowerCase() === 'confirmed'
      && Number.isFinite(amount) && amount > 0
      && SUPPORTED.has(String(record.currency || '').toUpperCase())
      && txHash.length >= 8 && !txHash.includes('...');
  }

  function summarizeVerifiedRecords(records) {
    const verified = Array.isArray(records) ? records.filter(isVerifiedRecord) : [];
    const amounts = {};
    for (const record of verified) {
      const currency = String(record.currency).toUpperCase();
      amounts[currency] = Number(((amounts[currency] || 0) + Number(record.amount)).toFixed(8));
    }
    return { count: verified.length, amounts, records: verified };
  }

  return { isVerifiedRecord, summarizeVerifiedRecords };
});
```

- [ ] **Step 8: Add the test script and run the full suite**

```json
"scripts": {
  "test": "node --test",
  "start": "node server.js"
}
```

Run: `npm test`

Expected: 5 tests pass.

- [ ] **Step 9: Commit**

```bash
git add package.json public/js/donation-flow.js public/js/public-records.js test
git commit -m "test: define trustworthy donation data behavior"
```

### Task 2: Replace The Donation Journey With A Two-Step Flow

**Files:**
- Modify: `public/donate.html`
- Create: `public/css/donation.css`
- Create: `public/js/donation-page.js`
- Modify: `test/donation-flow.test.js`

**Interfaces:**
- Consumes: `window.ALI_SITE_CONFIG.donations` and `window.ALI_DONATION_FLOW`.
- Produces: visible asset buttons, network-specific address state, copy fallback, explorer link, and live-region feedback.

- [ ] **Step 1: Add failing behavior checks for every supported asset**

```js
test('every configured asset produces a complete view', () => {
  for (const symbol of Object.keys(config)) {
    const view = getDonationView(config, symbol);
    assert.equal(view.symbol, symbol);
    assert.ok(view.address);
    assert.ok(view.network);
    assert.ok(view.explorerUrl.startsWith('https://'));
  }
});
```

Run: `node --test test/donation-flow.test.js`

Expected: FAIL until SOL/BNB/ETH fixtures and explorer behavior are complete.

- [ ] **Step 2: Complete the domain behavior and verify GREEN**

Add SOL and BSC fixtures, keep BSC explorer behavior shared by USDT/ETH/BNB, then run `node --test test/donation-flow.test.js`.

Expected: all donation tests pass.

- [ ] **Step 3: Rewrite the page around the two-step semantic structure**

```html
<main id="donation" class="donation-shell">
  <p class="eyebrow">Official donation addresses</p>
  <h1>Donate crypto in two steps.</h1>
  <p class="lede">Choose an asset, copy the official address, then send from your own wallet or exchange.</p>
  <p class="trust-note">No wallet connection. No seed phrase. No transaction is signed on this website.</p>

  <section class="donation-panel" aria-labelledby="asset-heading">
    <h2 id="asset-heading">1. Choose an asset</h2>
    <div id="assetOptions" class="asset-options" role="radiogroup" aria-label="Donation asset"></div>
    <div class="address-card">
      <span id="addressLabel"></span>
      <strong id="networkName"></strong>
      <code id="donationAddress"></code>
      <button id="copyAddress" type="button">Copy official address</button>
    </div>
    <p id="copyStatus" role="status" aria-live="polite"></p>
  </section>

  <section class="send-panel" aria-labelledby="send-heading">
    <h2 id="send-heading">2. Send from your wallet</h2>
    <p id="networkSafety"></p>
    <p>Send a small test transfer first if you are unsure. Keep the transaction hash for your records.</p>
    <a id="explorerLink" target="_blank" rel="noopener noreferrer">View the official address on a blockchain explorer</a>
  </section>

  <details>
    <summary>Safety checklist</summary>
    <ul><li>Compare the complete address.</li><li>Confirm the asset and network.</li><li>Never share a seed phrase or private key.</li></ul>
  </details>
</main>
```

- [ ] **Step 4: Bind asset buttons and robust copy behavior**

```js
(() => {
  const config = window.ALI_SITE_CONFIG?.donations;
  const flow = window.ALI_DONATION_FLOW;
  const symbols = ['USDT', 'BNB', 'ETH', 'BTC', 'SOL'];
  let selected = 'USDT';

  function render(symbol) {
    const view = flow.getDonationView(config, symbol);
    selected = view.symbol;
    document.querySelector('#networkName').textContent = view.network;
    document.querySelector('#addressLabel').textContent = `${view.symbol} address`;
    document.querySelector('#donationAddress').textContent = view.address;
    document.querySelector('#networkSafety').textContent = view.safetyText;
    document.querySelector('#explorerLink').href = view.explorerUrl;
    document.querySelectorAll('[data-asset]').forEach(button => {
      const active = button.dataset.asset === selected;
      button.setAttribute('aria-checked', String(active));
    });
  }

  async function copyAddress() {
    const address = flow.getDonationView(config, selected).address;
    const status = document.querySelector('#copyStatus');
    try {
      await navigator.clipboard.writeText(address);
      status.textContent = 'Official address copied.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#donationAddress'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      status.textContent = 'Address selected. Use your browser copy command.';
    }
  }

  const options = document.querySelector('#assetOptions');
  for (const symbol of symbols) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.asset = symbol;
    button.setAttribute('role', 'radio');
    button.textContent = symbol;
    button.addEventListener('click', () => render(symbol));
    options.append(button);
  }
  document.querySelector('#copyAddress').addEventListener('click', copyAddress);
  render(selected);
})();
```

- [ ] **Step 5: Implement responsive styles**

Create a single-column mobile layout, a maximum 760 px reading width, 44 px controls, visible focus, reduced-motion support, and word-breaking only on the address value.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add public/donate.html public/css/donation.css public/js/donation-page.js test/donation-flow.test.js
git commit -m "refactor: simplify crypto donation flow"
```

### Task 3: Rewrite The Homepage Around Trustworthy Static Content

**Files:**
- Modify: `public/index.html`
- Create: `public/css/home.css`
- Create: `public/js/home.js`
- Modify: `test/public-records.test.js`

**Interfaces:**
- Consumes: `/data/donations.json` and `window.ALI_PUBLIC_RECORDS`.
- Produces: a concise landing page and a verified-record empty/data state.

- [ ] **Step 1: Add a failing test that forbids synthetic public totals**

```js
const fs = require('node:fs');
const path = require('node:path');

test('homepage has no synthetic counters or unsupported financial claims', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  for (const forbidden of ['128 + days', '$18,460', '45,200', '28,500', '37,300', '$ 12,800']) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});
```

Run: `node --test test/public-records.test.js`

Expected: FAIL on the current homepage.

- [ ] **Step 2: Replace the homepage document**

The new document must contain exactly one H1, one Organization/WebSite JSON-LD graph, canonical navigation, hero actions, a two-step donation explanation, project-route list without raised amounts, a `verifiedRecords` region, transparency links, recent editorial links, and no admin UI or inline event handlers.

```html
<section class="hero">
  <div>
    <p class="eyebrow">Transparent crypto donations</p>
    <h1>Help people. Keep the proof public.</h1>
    <p>ALI Charity publishes official donation addresses, public records, and donor-safety guidance for humanitarian project routes.</p>
    <div class="actions"><a class="primary" href="/donate.html#donation">Donate crypto</a><a href="/donor-safety.html">Verify official addresses</a></div>
    <p class="trust-line">No wallet connection. We never ask for a seed phrase or private key.</p>
  </div>
  <img src="/assets/images/hero-global-aid-blockchain.jpg" width="1400" height="788" alt="People reviewing public aid records" fetchpriority="high">
</section>
```

- [ ] **Step 3: Render public records without fallback numbers**

```js
async function renderPublicRecords() {
  const target = document.querySelector('#verifiedRecords');
  try {
    const response = await fetch('/data/donations.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Public data unavailable');
    const data = await response.json();
    const summary = window.ALI_PUBLIC_RECORDS.summarizeVerifiedRecords(data.donations);
    target.textContent = summary.count
      ? `${summary.count} verified public donation record${summary.count === 1 ? '' : 's'}.`
      : 'No verified public donation records are currently published.';
  } catch {
    target.textContent = 'Public donation records are temporarily unavailable.';
  }
}
renderPublicRecords();
```

- [ ] **Step 4: Add mobile-first styles and verify GREEN**

Create `home.css` with a restrained navy/green palette, responsive hero, compact project list, visible focus, no continuous animation, and a mobile sticky donation action that does not overlap content.

Run: `node --test test/public-records.test.js`

Expected: all public-record tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/css/home.css public/js/home.js test/public-records.test.js
git commit -m "refactor: rebuild homepage around verifiable trust"
```

### Task 4: Add A Static Integrity And Metadata Build Gate

**Files:**
- Create: `test/site-validation.test.js`
- Create: `scripts/lib/site-validation.js`
- Create: `scripts/validate-site.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: the `public/` tree and hosting configuration.
- Produces: `validateSite(publicDir)` returning `{ errors, warnings, files }` and a non-zero CLI exit on errors.

- [ ] **Step 1: Write failing validator tests using temporary fixtures**

```js
test('reports broken links, duplicate canonicals, and forbidden public files', () => {
  const fixture = makeFixture({
    'index.html': '<link rel="canonical" href="https://example.com/"><a href="/missing.html">x</a>',
    'copy.html': '<link rel="canonical" href="https://example.com/">',
    'admin-login.html': '<title>Admin</title>'
  });
  const result = validateSite(fixture);
  assert.match(result.errors.join('\n'), /missing\.html/);
  assert.match(result.errors.join('\n'), /duplicate canonical/i);
  assert.match(result.errors.join('\n'), /admin-login\.html/);
});
```

Run: `node --test test/site-validation.test.js`

Expected: FAIL because the validator module does not exist.

- [ ] **Step 2: Implement recursive HTML validation**

Implement pure functions that walk files, extract canonical/href/src values, normalize root-relative and relative references, reject path escape, treat configured redirect sources as resolved, and flag names matching `admin|dashboard|test|backup|\.bak|-[vV][0-9]` under `public/`.

```js
function validateSite(publicDir, redirects = {}) {
  const files = walk(publicDir);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const errors = [];
  const canonicals = new Map();
  for (const file of htmlFiles) validateHtml({ file, publicDir, files, redirects, canonicals, errors });
  for (const [canonical, owners] of canonicals) {
    if (owners.length > 1) errors.push(`Duplicate canonical ${canonical}: ${owners.join(', ')}`);
  }
  return { errors, warnings: [], files };
}
```

- [ ] **Step 3: Verify RED becomes GREEN**

Run: `node --test test/site-validation.test.js`

Expected: validator fixture tests pass.

- [ ] **Step 4: Wire validation into build**

```json
"scripts": {
  "validate": "node scripts/validate-site.js",
  "build": "node scripts/write-deploy-version.js && node scripts/validate-site.js",
  "test": "node --test"
}
```

Run: `npm run validate`

Expected initially: FAIL and list the real repository's obsolete public files and broken links.

- [ ] **Step 5: Commit the gate before cleanup**

```bash
git add package.json scripts/lib/site-validation.js scripts/validate-site.js test/site-validation.test.js
git commit -m "test: add static site integrity gate"
```

### Task 5: Remove Static-Site Dead Code And Align Hosting Policies

**Files:**
- Modify: `server.js`
- Create: `scripts/lib/static-server.js`
- Create: `test/static-server.test.js`
- Modify: `netlify.toml`
- Modify: `render.yaml`
- Modify: `.gitignore`
- Delete: `backend/**`, `src/**`, `backups/**`
- Delete: obsolete public admin, test, backup, and versioned pages identified by the validator

**Interfaces:**
- Consumes: `public/` and HTTP GET/HEAD requests for local preview.
- Produces: a read-only static server and identical redirect/cache/security policy on both hosts.

- [ ] **Step 1: Write failing server path-safety tests**

```js
test('resolves normal pages and rejects traversal or malformed escapes', () => {
  assert.equal(resolveStaticPath(root, '/donate.html'), path.join(root, 'donate.html'));
  assert.equal(resolveStaticPath(root, '/../server.js'), null);
  assert.equal(resolveStaticPath(root, '/%E0%A4%A'), null);
});
```

Run: `node --test test/static-server.test.js`

Expected: FAIL because the static server module does not exist.

- [ ] **Step 2: Replace the dynamic server with a read-only preview server**

```js
const http = require('node:http');
const path = require('node:path');
const { createStaticServer } = require('./scripts/lib/static-server');

const port = Number(process.env.PORT || 3000);
createStaticServer(path.join(__dirname, 'public')).listen(port, () => {
  console.log(`ALI Charity static preview running on http://localhost:${port}`);
});
```

The library supports GET/HEAD, directory indexes, extensionless `.html`, correct MIME types, 404 pages, traversal rejection, and no writes, cookies, sessions, traffic recording, or admin routes.

- [ ] **Step 3: Add redirects before deleting obsolete public variants**

Map `/about-v2.html` to `/about.html`, donation variants to `/donate.html`, FAQ/team/token variants to canonical pages, and admin/test/backup paths to `/` or a 404 response as appropriate. Use permanent redirects for genuine duplicate public URLs and do not redirect admin/test paths into indexable content.

- [ ] **Step 4: Align headers and cache rules**

Set unversioned `/js/*` to revalidate, `/js/site-config.js` to `no-cache, no-store, must-revalidate`, and add `X-Frame-Options: DENY` plus a restrictive `Permissions-Policy`. Preserve `X-Content-Type-Options` and `Referrer-Policy`.

- [ ] **Step 5: Delete dead files and fix every validator-reported internal reference**

Use explicit tracked paths. Replace surviving legacy links such as `/blockchain-charity`, `/crypto-donations`, `/community`, `/transparency`, `/how-it-works`, and `/cookies` with real canonical destinations or configured redirects.

- [ ] **Step 6: Verify cleanup**

Run: `npm test && npm run validate && npm run build`

Expected: all tests pass, validation reports zero errors, and build exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove dynamic and public legacy surfaces"
```

### Task 6: Quality-Gate GEO Research And Promotion Publishing

**Files:**
- Create: `test/blog-promotion.test.js`
- Create: `scripts/lib/blog-promotion.js`
- Modify: `scripts/generate-blog-promotion.js`
- Modify: `scripts/geo-audit.js`
- Modify: `scripts/research/geo_seo_research.py`
- Modify: `.github/workflows/weekly-blog-promotion.yml`
- Delete: dated generated research snapshots superseded by `latest` outputs

**Interfaces:**
- Consumes: normalized source items and recent published headlines.
- Produces: `chooseTopic(items, recentTitles)`, `buildBlogPostingJsonLd(article)`, and either one qualified article or a clean no-publication result.

- [ ] **Step 1: Write failing quality-gate tests**

```js
test('does not publish without enough independent sources', () => {
  assert.equal(chooseTopic([], []), null);
  assert.equal(chooseTopic([{ source: 'A', title: 'One', link: 'https://a.example' }], []), null);
});

test('rejects a near-duplicate recent topic', () => {
  const items = [
    { source: 'UN News', title: 'Aid cuts deepen hunger crisis', link: 'https://news.un.org/a' },
    { source: 'WFP', title: 'Funding gap threatens food support', link: 'https://wfp.org/b' }
  ];
  assert.equal(chooseTopic(items, ['Aid cuts deepen the hunger crisis']), null);
});

test('BlogPosting uses citation URLs and deduplicated keywords', () => {
  const schema = buildBlogPostingJsonLd(articleFixture);
  assert.equal(schema['@type'], 'BlogPosting');
  assert.deepEqual(schema.citation, ['https://news.un.org/a', 'https://wfp.org/b']);
  assert.equal(new Set(schema.keywords).size, schema.keywords.length);
});
```

Run: `node --test test/blog-promotion.test.js`

Expected: FAIL because the library does not exist.

- [ ] **Step 2: Extract and implement pure quality functions**

Use normalized titles, token overlap for duplicate detection, distinct source domains, valid HTTPS URLs, and a minimum of two independent sources. Build one `BlogPosting` schema with `citation`, `datePublished`, `dateModified`, `inLanguage`, author, publisher, image, and canonical `mainEntityOfPage`.

- [ ] **Step 3: Remove fabricated fallback publication**

```js
const topic = chooseTopic(hotItems, recentTitles);
if (!topic) {
  console.log('No qualified original promotion topic today; publication skipped.');
  return;
}
```

The generator must not call `pickFallbackTopic`, write an article, or update a sitemap when qualification fails.

- [ ] **Step 4: Fix visible and machine-readable article quality**

Render a direct answer, editorial disclosure, source list, original donor analysis, and a visible “Sources and methodology” section. Remove malformed `Today&amp;apos;s`, invalid `ListItem` mentions, duplicated keywords, and universal FAQ schema.

- [ ] **Step 5: Update GEO audit scoring**

Score direct answer, canonical metadata, valid BlogPosting fields, citation links, dates, and explicit subject. Do not award points merely for adding five FAQ questions.

- [ ] **Step 6: Stop committing dated research noise**

Make research scripts write `memory/research/geo-seo/latest.md` and `latest.jsonl`. Update the workflow to run `npm test`, `npm run build`, research, GEO audit, article generation, and `npm run validate` before committing only changed latest reports and qualified content.

- [ ] **Step 7: Verify and commit**

Run: `npm test && npm run geo:audit && npm run validate && npm run build`

Expected: all tests pass, audit outputs parse, no fallback article is created from an empty-source fixture, validation has zero errors.

```bash
git add -A
git commit -m "refactor: quality-gate GEO publishing"
```

### Task 7: Full Visual, Accessibility, And Release Verification

**Files:**
- Create: `docs/audits/2026-08-26-static-site-ux-audit.md`
- Modify only if verification reveals a defect: core HTML/CSS/JS or tests from earlier tasks

**Interfaces:**
- Consumes: the complete local static build.
- Produces: accepted desktop/mobile screenshots, an evidence-linked audit, a verified fast-forward release, and deployed health results.

- [ ] **Step 1: Start the local preview and verify core routes**

Run: `npm start`

Check `/`, `/donate.html`, `/donor-safety.html`, `/about.html`, `/blog/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/data/donations.json`, and `/js/site-config.js`.

- [ ] **Step 2: Capture and inspect desktop and 390 px mobile states**

Capture homepage, donation default USDT, donation BTC selection, and copy feedback. Inspect every saved screenshot for loading failures, overflow, overlap, unreadable text, misleading labels, and wrong network copy.

- [ ] **Step 3: Perform keyboard and semantic checks**

Verify skip link, navigation, asset radio buttons, copy action, details disclosure, explorer link, focus order, visible focus, and live-region feedback. Record screenshot-only accessibility limits instead of claiming WCAG compliance.

- [ ] **Step 4: Run the complete fresh verification gate**

```bash
npm test
npm run validate
npm run build
node --check server.js
git diff --check
git status --short
```

Expected: zero test failures, zero validation errors, build exit 0, syntax exit 0, no whitespace errors, and only intended tracked changes.

- [ ] **Step 5: Verify Git ancestry before release**

```bash
git merge-base --is-ancestor 0a460b2 HEAD
git merge-base --is-ancestor origin/main HEAD
git log --oneline --decorate origin/main..HEAD
```

Expected: both ancestry checks exit 0 and the unpublished trust-page commit remains in history.

- [ ] **Step 6: Commit the audit and push the verified fast-forward chain**

```bash
git add docs/audits/2026-08-26-static-site-ux-audit.md
git commit -m "docs: record static site UX audit"
git push origin HEAD:main
```

- [ ] **Step 7: Verify deployed health**

Run: `npm run deploy:check`

Expected: required production routes, canonical content markers, and deployment version checks pass. If host propagation is delayed, poll within the health script's bounded retry behavior and report the actual result.

## Plan Self-Review

- Every design requirement maps to at least one task.
- Production behavior begins with a failing test.
- Module signatures are consistent across tasks.
- The plan contains no placeholder implementation steps.
- Release preserves the unpublished `0a460b2` commit and requires a fast-forward push.
