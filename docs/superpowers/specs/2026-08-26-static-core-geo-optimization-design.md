# ALI Charity Static Core and GEO Optimization Design

Date: 2026-08-26
Status: Approved by user direction (“use the recommended approach and do not ask for further confirmation”)

## Goal

Turn ALI Charity into a trustworthy, fast, maintainable static website with a genuinely simple donation journey and a restrained, evidence-led GEO/SEO publishing pipeline.

## Success Criteria

- A donor can reach the official address for a chosen asset in one screen and copy it without completing a form.
- The page never connects a wallet, requests a private key, signs a transaction, or implies that a browser-only record was submitted to ALI Charity.
- Public totals, project results, and expenditures are shown only when backed by the public data file or an explicit verifiable source.
- Core pages work on 390 px mobile and desktop layouts with keyboard-accessible controls and visible focus.
- Build validation detects broken internal references, duplicate canonical URLs, missing required metadata, exposed admin/test/backup pages, and malformed donation configuration.
- Generated promotion articles pass uniqueness, source, date, canonical, and structured-data checks before being committed.
- Existing canonical public URLs remain stable; retired URLs redirect to a relevant canonical page.
- The local preview, automated tests, build, and deployed health checks pass before release.

## Non-Goals

- No wallet connection, WalletConnect, MetaMask transaction request, automatic transfer, or smart-contract interaction.
- No private-key handling, liquidity-pool creation, trading, or wallet signing.
- No dynamic administrator login, donation moderation API, traffic database, or server-side session system.
- No migration of every historical article into a new framework in this iteration.
- No promise of search rankings, AI citations, token value, investment return, or automatic ALI token distribution.

## Evidence From The Existing Experience

The current static deployment publishes a three-step donation page. The first two steps explain how to copy an address and send from an external wallet. The third step asks for amount, transaction hash, and contact information but saves them only in the donor's browser. That creates effort without submitting anything to the project.

The homepage also contains hard-coded and time-increasing donation totals, project funding figures, expenditure figures, and donor-success placeholders that do not match `public/data/donations.json`. These claims weaken donor trust and machine-readable credibility.

The repository contains multiple obsolete Node servers, public admin pages, test pages, backups, and versioned page variants. The production configuration deploys only `public/`, so the dynamic APIs are not available online even though several pages imply otherwise.

## Architecture

The project remains a dependency-light static site.

- `public/` contains only production assets and canonical pages.
- `public/js/site-config.js` remains the single public source of donation addresses.
- `public/js/donation-flow.js` owns asset selection, display state, copy behavior, explorer links, and accessible status announcements.
- `public/js/home.js` owns the minimal homepage interactions: navigation, public-data rendering, and language affordances that remain supported.
- `public/css/home.css`, `public/css/donation.css`, and the existing shared polish stylesheet provide responsive styling without runtime Tailwind.
- `scripts/serve-static.js` is a local preview server only. It has no authentication, write API, tracking, or data mutation.
- `scripts/validate-site.js` is the build gate for static integrity, safety, metadata, and internal links.
- `scripts/lib/` contains pure functions used by the validator and promotion generator so Node's built-in test runner can exercise them.
- Render and Netlify both publish `public/` with matching redirects, security headers, and cache rules.

## Core User Experience

### Homepage

The homepage is rewritten as a focused trust and donation landing page instead of retaining the current 200 KB collection of legacy scripts and duplicated schema blocks.

The first viewport contains:

1. A concise explanation of ALI Charity.
2. One primary “Donate crypto” action.
3. One secondary “Verify official addresses” action.
4. A short statement that the site does not connect wallets or request seed phrases.
5. Existing humanitarian imagery, optimized for responsive loading.

The remaining page contains:

- a two-step explanation of the donation journey;
- a compact list of project routes without unverified raised amounts;
- a public-record section derived from `public/data/donations.json`;
- a transparency section that links to the explorer, donor-safety page, methodology, and public data;
- an editorial/blog section with recent useful content;
- a restrained footer with canonical navigation.

The animated floating “Lightning Donate” control is replaced by a non-pulsing mobile sticky action and a normal desktop call to action. It links directly to the donation selector.

### Lightning Donation

The primary flow has two visible steps:

1. Select an asset using visible asset buttons. USDT on BNB Smart Chain is the default.
2. Copy the official address, then send from the donor's own wallet or exchange.

Changing the asset immediately updates:

- selected state;
- exact network name;
- address label and address;
- network-specific safety text;
- explorer URL.

The main panel includes one dominant “Copy official address” button. Successful copy produces an accessible live-region message and updates the button text temporarily. Clipboard failure selects the address and explains how to copy manually.

The amount, transaction-hash, contact/note, and “Save locally” fields are removed from the primary page. The page explains that donors should keep the transaction hash in their own records and offers an explorer link. A collapsed safety section covers irreversible transfers, wrong-network loss, small test transfers, and seed-phrase fraud.

### Public Evidence

Only records that satisfy all of the following can contribute to displayed totals:

- status is `confirmed`;
- amount is a finite positive number;
- currency is supported;
- transaction reference is non-empty and not an obvious placeholder;
- the record can be linked to an appropriate public explorer.

If no record qualifies, the interface says that no verified public donation records are currently published. It does not display synthetic counters, auto-incrementing seed values, placeholder donor stories, or unsupported expenditure totals.

## Static Cleanup

Remove or retire:

- root dynamic admin server behavior;
- `backend/` and `src/` historical server variants;
- public admin login/dashboard pages;
- public test pages and backup/version variants;
- JavaScript that stores or edits donation/admin records in `localStorage`;
- duplicate structured-data blocks and obsolete emergency redirect scripts.

Canonical pages retain their URLs. Retired public variants redirect to the closest canonical page through both hosting configurations. Files that are not public content, such as research output and temporary visual-audit artifacts, are excluded from deployment and source-control noise.

## GEO and Editorial Strategy

The project stops treating publishing frequency as the primary GEO signal. Official Google guidance warns against extensive automation that mainly summarizes other sources for search traffic. The pipeline therefore prioritizes original donor guidance, verifiable project facts, and source transparency.

### Content Rules

- Publish no article when source retrieval fails or the available items merely repeat a recent topic.
- Require a clear donor question, a direct answer near the top, original ALI Charity analysis, named sources, and a visible editorial disclosure.
- Do not create unsupported humanitarian impact claims or token-return claims.
- Use one canonical URL and one coherent page purpose.
- Prefer updating evergreen guides when they answer the same intent better than creating another near-duplicate daily page.
- Keep source headlines and URLs, but do not republish source article bodies.

### Structured Data

- Homepage: one `Organization`/`NGO` entity plus `WebSite` and appropriate `DonateAction` information.
- Donation page: `WebPage` plus a factual `HowTo` matching the visible two-step flow.
- Blog article: one `BlogPosting` with headline, description, image, author, publisher, dates, canonical main entity, `citation` URLs, and language.
- FAQ structured data appears only where the same questions and answers are visibly present and useful. It is not added to every generated article merely to increase schema count.
- Every JSON-LD block must parse and match the visible page.

### Discovery and Indexing

- Sitemaps contain canonical, indexable production URLs only, without test, admin, backup, or duplicate variants.
- `lastmod` changes only when page content changes.
- `robots.txt` references the canonical sitemap and does not rely on `robots.txt` as a substitute for removing or noindexing unwanted pages.
- IndexNow submits only changed canonical URLs. A successful submission means receipt, not guaranteed indexing.
- `llms.txt` remains a concise navigation and entity file, not a keyword dump.

## Performance, Accessibility, and Security

- Remove runtime Tailwind and large duplicated inline script/style blocks from the rewritten homepage and donation page.
- Use responsive local images with explicit dimensions and lazy loading below the fold.
- Keep touch targets at least 44 px high, visible keyboard focus, semantic headings, labels, and status announcements.
- Respect `prefers-reduced-motion`; remove continuous pulsing from donation controls.
- Use cache revalidation for unversioned JavaScript and `no-cache`/short cache for `site-config.js` so address updates cannot remain stale for a year.
- Add consistent `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy` headers. A strict CSP is deferred until remaining legacy inline scripts are migrated; the validator records this as known debt rather than claiming full CSP coverage.
- External links opened in a new tab use `rel="noopener noreferrer"`.

## Error Handling

- Missing or malformed donation configuration disables the copy action and shows a plain error without falling back to a hard-coded address.
- Clipboard errors use manual selection as a safe fallback.
- Public data fetch failures show an unavailable state, never seed or cached promotional numbers.
- Promotion source failures stop publication cleanly; they do not generate a fabricated fallback news article.
- Site validation exits non-zero with exact file and rule details.

## Testing and Release

Use Node's built-in `node:test` and assertion modules; no runtime framework dependency is required.

Test groups:

- donation configuration and asset view-model behavior;
- confirmed-record filtering and summary calculation;
- promotion topic deduplication, escaping, citations, and no-source behavior;
- static-link and canonical validation;
- forbidden public files and placeholder financial claims;
- deployment redirects, security headers, and cache policy.

Release gate:

1. Observe each new regression test fail for the intended reason.
2. Implement the smallest change that passes it.
3. Run the focused test, then the full test suite.
4. Run JavaScript syntax checks, static validation, and the production build.
5. Inspect desktop and 390 px mobile screenshots for the homepage and donation flow.
6. Commit the verified result and fast-forward `origin/main` only if the local history still contains the existing `0a460b2` trust-page commit.
7. Run deployed health checks after the host updates.

## Risks and Mitigations

- **Large homepage replacement:** preserve canonical URL, core navigation, existing project imagery, and essential structured facts; validate links and capture before/after screenshots.
- **Retired URLs:** add explicit redirects before removing files.
- **Address correctness:** keep `site-config.js` as the only address source and test exact supported asset/network mappings.
- **Automated publishing:** fail closed when source or quality checks fail; never fabricate a fallback story.
- **Deployment from detached worktree:** verify ancestry and push only a fast-forward commit chain that includes the existing unpublished commit.

## Official References

- Google Search Central: Creating helpful, reliable, people-first content.
- Google Search Central: Crawling and indexing guidance, canonicalization, sitemaps, robots controls, and JavaScript SEO.
- Google Search Central: Article structured data.
- Schema.org: `BlogPosting`, `citation`, `datePublished`, and `dateModified`.
- IndexNow protocol documentation for changed-URL submissions and response meanings.
