const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'memory', 'research', 'geo-audit');
const BASE_URL = process.env.BLOG_BASE_URL || 'https://minadoai.com';

const EXCLUDE = new Set([
  'admin.html',
  'admin-login.html',
  'dashboard.html',
  'cache-buster.html',
  'clear-cache.html',
  'test-connection.html',
  'test-donate.html',
  'test-v2.html'
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full;
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleOf(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 140) : '';
}

function metaDescription(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i);
  return match ? match[1].trim() : '';
}

function urlFor(file) {
  const rel = path.relative(PUBLIC_DIR, file).replace(/\\/g, '/');
  return `${BASE_URL}/${rel === 'index.html' ? '' : rel}`;
}

function hasCompleteSubject(text) {
  const first = text.slice(0, 260).toLowerCase();
  return /\bali charity\b/.test(first)
    || /\bali token\b/.test(first)
    || /\bthe donate page\b/.test(first)
    || /\bthis guide\b/.test(first);
}

function scorePage(file) {
  const html = fs.readFileSync(file, 'utf8');
  const text = stripHtml(html);
  const first320 = text.slice(0, 320);
  const words = text.split(/\s+/).filter(Boolean);
  const numberCount = (text.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []).length;
  const addressCount = (text.match(/0x[a-fA-F0-9]{40}|bc1[a-z0-9]{20,}|[1-9A-HJ-NP-Za-km-z]{32,44}/g) || []).length;
  const jsonLdCount = (html.match(/application\/ld\+json/gi) || []).length;
  const headingCount = (html.match(/<h[1-3][^>]*>/gi) || []).length;
  const canonical = /rel=["']canonical["']/i.test(html);
  const blogPosting = /"@type"\s*:\s*"BlogPosting"/i.test(html);
  const citationCount = (html.match(/"citation"\s*:/gi) || []).length
    + (html.match(/<a[^>]+href=["']https:\/\/(?!minadoai\.com)/gi) || []).length;
  const dates = /"datePublished"\s*:/.test(html) && /"dateModified"\s*:/.test(html);

  const dimensions = {
    directAnswer: first320.length >= 80 && /(is|accepts|verify|donate|tracks|guide|proof|charity)/i.test(first320) ? 2 : 0,
    canonicalMetadata: canonical && Boolean(metaDescription(html)) ? 2 : 0,
    structuredData: jsonLdCount && (!blogPosting || dates) ? 2 : 0,
    citations: blogPosting ? Math.min(2, citationCount) : 2,
    explicitSubject: hasCompleteSubject(text) ? 2 : 0
  };

  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  const reasons = [];
  if (dimensions.directAnswer < 2) reasons.push('Opening copy does not provide a direct, self-contained answer.');
  if (dimensions.canonicalMetadata < 2) reasons.push('Canonical URL or meta description is missing.');
  if (dimensions.structuredData < 2) reasons.push('Structured data is missing or an article lacks publication and modification dates.');
  if (dimensions.citations < 2) reasons.push('Article does not expose at least two traceable citation links.');
  if (dimensions.explicitSubject < 2) reasons.push('Main subject is not explicit near the top.');

  return {
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    url: urlFor(file),
    title: titleOf(html),
    metaDescription: metaDescription(html),
    score,
    dimensions,
    stats: {
      words: words.length,
      numbers: numberCount,
      addresses: addressCount,
      jsonLdBlocks: jsonLdCount,
      citations: citationCount,
      headings: headingCount,
      canonical
    },
    reasons: reasons.slice(0, 3),
    direction: [
      dimensions.directAnswer < 2 ? 'Rewrite the opening as a direct answer.' : null,
      dimensions.canonicalMetadata < 2 ? 'Add a unique canonical and specific meta description.' : null,
      dimensions.structuredData < 2 ? 'Add valid WebPage or BlogPosting JSON-LD with dates.' : null,
      dimensions.citations < 2 ? 'Add at least two source links and citation URLs.' : null,
      dimensions.explicitSubject < 2 ? 'Name the subject explicitly near the top.' : null
    ].filter(Boolean)
  };
}

function markdownReport(results) {
  const low = results.filter((page) => page.score < 8).slice(0, 30);
  const rows = low.map((page, index) => {
    const dims = Object.entries(page.dimensions).map(([key, value]) => `${key}:${value}`).join(', ');
    return `| ${index + 1} | ${page.score}/10 | ${page.file} | ${dims} | ${page.reasons.join(' ')} |`;
  }).join('\n');

  return `# ALI Charity GEO Health Audit

Generated: ${new Date().toISOString()}

Scoring model: 10 points across five dimensions: direct answer, canonical metadata, valid structured data and article dates, traceable citations, and explicit subject usage.

## Lowest-Scoring Pages

| Rank | Score | Page | Dimensions | Top Deductions |
| --- | ---: | --- | --- | --- |
${rows || '| - | - | No low-scoring pages found. | - | - |'}

## Recommended Batch Fix Pattern

- Start each priority page with a direct answer sentence naming ALI Charity, ALI Token, crypto donation safety, or the page's exact purpose.
- Replace vague claims with verifiable facts, dates, network details, transaction evidence, and clear limitations.
- Add or expand WebPage or BlogPosting JSON-LD with canonical URLs and article dates.
- Link articles to primary or authoritative sources and expose those URLs through the citation property.
- Use complete nouns near the top: "ALI Charity", "ALI Token", "the Donate page", "the donor safety guide".
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pages = walk(PUBLIC_DIR)
    .filter((file) => file.endsWith('.html'))
    .filter((file) => !EXCLUDE.has(path.basename(file)));

  const results = pages
    .map(scorePage)
    .sort((a, b) => a.score - b.score || a.file.localeCompare(b.file));

  const latestJson = path.join(OUT_DIR, 'latest.json');
  const latestMd = path.join(OUT_DIR, 'latest.md');
  fs.writeFileSync(latestJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: results }, null, 2)}\n`);
  fs.writeFileSync(latestMd, markdownReport(results));

  console.log(`Audited ${results.length} HTML pages.`);
  console.log(`Wrote ${path.relative(ROOT, latestJson)} and ${path.relative(ROOT, latestMd)}.`);
  results.slice(0, 10).forEach((page, index) => {
    console.log(`${index + 1}. ${page.score}/10 ${page.file}`);
  });
}

main();
