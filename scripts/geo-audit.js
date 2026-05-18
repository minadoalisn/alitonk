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
  const first50 = text.slice(0, 50);
  const first250 = text.slice(0, 250);
  const words = text.split(/\s+/).filter(Boolean);
  const numberCount = (text.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []).length;
  const addressCount = (text.match(/0x[a-fA-F0-9]{40}|bc1[a-z0-9]{20,}|[1-9A-HJ-NP-Za-km-z]{32,44}/g) || []).length;
  const jsonLdCount = (html.match(/application\/ld\+json/gi) || []).length;
  const faqCount = (html.match(/"@type"\s*:\s*"Question"/gi) || []).length;
  const headingCount = (html.match(/<h[1-3][^>]*>/gi) || []).length;
  const canonical = /rel=["']canonical["']/i.test(html);

  const dimensions = {
    answerFirst50: first50.length >= 35 && /(is|accepts|verify|donate|tracks|guide|platform|token|charity)/i.test(first250) ? 2 : 0,
    parameterDensity: Math.min(2, Math.floor((numberCount + addressCount + headingCount) / 5)),
    schema: Math.min(2, jsonLdCount + (canonical ? 1 : 0)),
    faq: faqCount >= 5 ? 2 : faqCount >= 3 ? 1 : 0,
    subject: hasCompleteSubject(text) ? 2 : 0
  };

  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  const reasons = [];
  if (dimensions.answerFirst50 < 2) reasons.push('Opening copy does not answer the target query within the first 50 visible characters.');
  if (dimensions.parameterDensity < 2) reasons.push('Low parameter density: add exact assets, chains, addresses, dates, fees, counts, or verification steps.');
  if (dimensions.schema < 2) reasons.push('Missing or thin canonical/JSON-LD structure for AI and search parsers.');
  if (dimensions.faq < 2) reasons.push('FAQ coverage is below 5 question-answer pairs.');
  if (dimensions.subject < 2) reasons.push('Main subject is not explicit enough near the top; repeat ALI Charity, ALI Token, or donor safety clearly.');

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
      faqQuestions: faqCount,
      headings: headingCount,
      canonical
    },
    reasons: reasons.slice(0, 3),
    direction: [
      dimensions.answerFirst50 < 2 ? 'Rewrite the first sentence as a direct answer.' : null,
      dimensions.parameterDensity < 2 ? 'Add concrete chain, asset, address, count, date, and risk details.' : null,
      dimensions.schema < 2 ? 'Add WebPage/Article/Product-style JSON-LD and canonical URL.' : null,
      dimensions.faq < 2 ? 'Add 5-8 FAQPage questions with donor-facing answers.' : null,
      dimensions.subject < 2 ? 'Use complete subjects instead of pronouns in the opening section.' : null
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

Scoring model: 10 points across five dimensions: direct answer in first 50 visible characters, parameter density, Schema/canonical structure, FAQ coverage, and complete subject usage.

## Lowest-Scoring Pages

| Rank | Score | Page | Dimensions | Top Deductions |
| --- | ---: | --- | --- | --- |
${rows || '| - | - | No low-scoring pages found. | - | - |'}

## Recommended Batch Fix Pattern

- Start each priority page with a direct answer sentence naming ALI Charity, ALI Token, crypto donation safety, or the page's exact purpose.
- Replace vague claims with facts: accepted assets, BNB Smart Chain, contract address, donation address source, 13 project routes, transaction hash review, and no-return disclaimers.
- Add or expand JSON-LD with WebPage/Article/FAQPage where appropriate.
- Add 5-8 FAQ questions to pages that currently answer only one or two donor questions.
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
