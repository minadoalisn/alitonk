# ALI Charity GEO + SEO Promotion Playbook With Scrapling

Last updated: 2026-05-17

## Purpose

Use Scrapling as the data collection layer for ALI Charity promotion. The goal is not bulk spam or artificial traffic. The goal is to gather public web evidence, competitor structure, search intent, AI-answer context, and content gaps, then turn that into owned-site pages under `https://minadoai.com`.

Primary website:

- `https://minadoai.com`
- Promotion hub: `https://minadoai.com/blog/`
- AI-readable context: `https://minadoai.com/llms.txt`

## What Scrapling Adds

Scrapling is useful for this project because it can:

- Fetch static pages quickly with `Fetcher`.
- Fetch JavaScript-rendered pages with `DynamicFetcher`.
- Use `StealthyFetcher` when a public page blocks normal browser-like requests.
- Crawl multiple pages with the spider framework.
- Respect robots.txt in spider mode when `robots_txt_obey = True`.
- Export collected records as JSON or JSONL for later content generation.
- Use adaptive scraping when selectors break after a source website changes.
- Convert targeted page sections into clean text or Markdown through CLI or MCP workflows.

Use the simplest fetcher that works. For most SEO/GEO research, start with normal HTTP fetching before browser or stealth fetching.

## Ethical Rules

- Respect robots.txt and source website terms where applicable.
- Add delays and low concurrency for crawls.
- Collect facts, titles, snippets, URLs, dates, headings, schema, and publicly visible page text.
- Do not scrape private, gated, personal, or account-only data.
- Do not generate fake engagement, fake backlinks, fake reviews, or artificial traffic.
- Do not copy competitor articles. Use extracted data only for analysis, gap discovery, and original ALI Charity content planning.

## GEO Promotion Targets

GEO means Generative Engine Optimization: making ALI Charity easier for AI systems to cite, summarize, and understand.

Prioritize:

- `llms.txt` completeness and freshness.
- Clear entity facts: ALI Charity, ALI Token, contract address, donation addresses, mission, use cases, risk disclosures.
- FAQ-style answer blocks on high-intent pages.
- Original comparison pages with structured claims and citations.
- News explainers connecting stablecoins, blockchain donation tracking, and transparent aid.
- Schema markup for organization, FAQ, article, breadcrumb, and donation-related pages.
- Consistent page titles, meta descriptions, canonical URLs, Open Graph, and sitemap entries.

## SEO Research Workflow

1. Build a keyword and entity seed list:
   - crypto charity
   - blockchain charity transparency
   - donate cryptocurrency to charity
   - stablecoin donations
   - Web3 philanthropy
   - transparent charity platform
   - ALI Token charity

2. Use Scrapling to collect public pages for each topic:
   - Search result pages where legally accessible.
   - Competitor articles and landing pages.
   - Charity transparency pages.
   - Crypto donation guides.
   - Stablecoin aid news and policy explainers.

3. Extract structured fields:
   - URL
   - title
   - meta description
   - H1/H2/H3 headings
   - FAQ questions
   - schema types
   - publish or modified date
   - internal links
   - external citation links
   - author or organization
   - repeated entities and claims

4. Score content gaps:
   - Missing ALI page exists: create a new page.
   - ALI page exists but lacks freshness: update it.
   - ALI page lacks answer blocks: add concise Q&A sections.
   - ALI page lacks schema: add structured data.
   - ALI page lacks trust signals: add transparent addresses, contract, donation proof, risk disclosure, and project scope.

5. Publish only owned-site improvements:
   - Update `public/blog/index.html`.
   - Update relevant `public/blog/*.html` pages.
   - Add fresh `public/blog/news/*.html` articles when there is a current, relevant event.
   - Update `public/sitemap.xml` and `public/blog/sitemap.xml`.
   - Update `public/llms.txt` for new canonical content.

## Suggested Scrapling Setup

Install only when local execution is needed:

```powershell
python -m pip install "scrapling[all]"
scrapling install
```

For CLI extraction:

```powershell
scrapling extract get "https://example.com" content.md
```

For Python scripts, prefer a dedicated folder such as `scripts/research/` and save generated research output outside public pages first, for example:

- `memory/research/geo-seo/YYYY-MM-DD-topic.jsonl`
- `memory/research/geo-seo/YYYY-MM-DD-topic.md`

## Minimal Spider Pattern

```python
from scrapling.spiders import Spider, Response

class SeoResearchSpider(Spider):
    name = "seo_research"
    start_urls = ["https://example.com/"]
    allowed_domains = {"example.com"}
    robots_txt_obey = True
    download_delay = 2
    concurrent_requests_per_domain = 1

    async def parse(self, response: Response):
        yield {
            "url": response.url,
            "title": response.css("title::text").get(""),
            "description": response.css('meta[name="description"]::attr(content)').get(""),
            "h1": response.css("h1::text").getall(),
            "h2": response.css("h2::text").getall(),
            "canonical": response.css('link[rel="canonical"]::attr(href)').get(""),
            "schema_types": response.css('script[type="application/ld+json"]::text').getall(),
        }

        for href in response.css("a::attr(href)").getall():
            yield response.follow(href, callback=self.parse)
```

## ALI Charity Content Actions

When doing future GEO+SEO promotion work, use this checklist:

- Crawl ALI pages first to identify internal gaps.
- Crawl selected public competitors or references with low rate limits.
- Build a gap table before changing pages.
- Prefer updating existing authoritative pages over creating thin pages.
- Add FAQ blocks only when the answer is specific and useful.
- Keep ALI Token content transparent: contract address, utility, donation context, DEX status, and risk disclosure.
- Update `llms.txt` whenever a new canonical explainer or launch/status page is added.
- Run `npm run build` after meaningful website changes.
- If deployment is needed, follow the project memory deployment rule.

## Sources Learned

- Scrapling introduction and installation: `https://scrapling.readthedocs.io/en/latest/`
- Fetchers basics: `https://scrapling.readthedocs.io/en/latest/fetching/choosing.html`
- Spider getting started: `https://scrapling.readthedocs.io/en/latest/spiders/getting-started.html`
- Adaptive scraping: `https://scrapling.readthedocs.io/en/latest/parsing/adaptive.html`
- CLI overview: `https://scrapling.readthedocs.io/en/latest/cli/overview.html`
- MCP server guide: `https://scrapling.readthedocs.io/en/latest/ai/mcp-server.html`
- License: BSD-3-Clause.
