# ALI Charity Autonomous Promotion System

Last updated: 2026-05-17

## Current Progress

- 24x7 Codex automation is active: `ALI Charity 24x7 SEO GEO Growth Ops`.
- Schedule: hourly, every day.
- Primary site: `https://minadoai.com`.
- Owned promotion hub: `public/promotion.html`.
- Main content engine: `scripts/generate-blog-promotion.js`.
- GEO/SEO research engine: `scripts/research/geo_seo_research.py`.
- AI-readable context: `public/llms.txt`.
- Deployment health check: `npm run deploy:check`.
- GitHub Actions promotion workflow: `.github/workflows/weekly-blog-promotion.yml`.
- Active guardrail: no spam, no fake trading volume, no return promises, no wallet signing, no liquidity creation, no token/donation address changes outside `public/js/site-config.js`.

## Operating Loop

Each autonomous run should complete one useful owned-channel growth action.

1. Learn current signals.
   - Check current official or high-signal sources for Web3 growth, AI/GEO search, BNB Chain, Binance Alpha/Binance Wallet discovery, stablecoin aid, crypto charity, humanitarian relief, and donor-safety trends.
   - Prefer official docs, major ecosystem announcements, reputable humanitarian data sources, and established crypto media.

2. Choose one safe action.
   - Improve an owned page, blog post, FAQ block, structured data, sitemap, `llms.txt`, internal link, donor-safety explanation, DEX readiness explanation, or promotion copy.
   - Do not create off-site spam or artificial engagement.

3. Publish or prepare.
   - If content changes are made, update relevant indexes and sitemap files.
   - Keep new claims source-linked and avoid investment language.
   - Keep ALI framed as donor recognition / transparency utility unless a verified live market page exists.

4. Verify.
   - Run `npm run build`.
   - Run lightweight page/link checks when relevant.
   - Run `npm run deploy:check` after deployment-affecting changes.

5. Report.
   - Summarize changed files, learned sources, affected URLs, checks run, and next best growth action.

## Growth Channels

- Owned SEO: homepage, promotion hub, blog guides, news briefings, token/DEX readiness pages.
- GEO / AI search: `llms.txt`, concise FAQ schema, answer-ready headings, source-backed summaries, internal links.
- BNB Chain discoverability: BscScan contract references, PancakeSwap readiness content, DexScreener/GeckoTerminal preparation copy after a live pool exists.
- Donor trust: public wallet addresses, transaction-hash review, risk disclosure, no-return language, humanitarian proof pages.
- Community content: share-ready copy blocks for X, Telegram, Discord, Reddit, LinkedIn, and donor communities, but only for manual or approved posting.

## KPI Targets

- Fresh owned content cadence: at least one useful content or GEO improvement per day.
- Technical health: sitemap, blog index, canonical URLs, Open Graph, and `llms.txt` stay current.
- Trust health: every token/trading page includes risk disclosure and official contract context.
- Discovery health: promotion pages answer direct questions such as "what is ALI Charity", "how to donate crypto safely", "how ALI token works", and "is ALI tradable".

## Escalation Points

Ask the user before:

- Submitting Binance, exchange, wallet, token-list, grant, or marketplace applications.
- Using account credentials, posting to social accounts, or sending outreach messages.
- Creating liquidity, signing transactions, changing token configuration, or changing donation addresses.
- Making claims about partnerships, audits, listings, price, or guaranteed impact that are not already verified.

## Next Priorities

1. Finish and deploy the current UI/system updates cleanly.
2. Add a public "operations and transparency" section or page if the site needs a user-facing version of this system.
3. Prepare post-PancakeSwap launch update templates for DexScreener, GeckoTerminal, CoinGecko, CoinMarketCap, and Binance Alpha discovery readiness.
4. Expand multilingual answer-ready content for English, Chinese, Arabic, Spanish, French, and Indonesian donor search intent.
