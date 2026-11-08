const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const { buildBlogPostingJsonLd, chooseTopic, decodeEntities, relevance } = require('./lib/blog-promotion');
const { applyLayout } = require('./apply-layout');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'blog', 'briefings');
const BASE_URL = process.env.BLOG_BASE_URL || 'https://minadoai.com';
const SOURCES = [
  { source: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml' },
  { source: 'ReliefWeb', url: 'https://reliefweb.int/updates/rss.xml' },
  { source: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' }
];

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decode(value) {
  return decodeEntities(value);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
}

function fetchUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'ALI-Charity-Editorial-Research/3.0 (+https://minadoai.com)' }, timeout: 20000 }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 4) {
        response.resume();
        return resolve(fetchUrl(new URL(response.headers.location, url).toString(), redirects + 1));
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(body));
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decode(match ? match[1] : '');
}

function parseFeed(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 20).map(match => {
    const title = tag(match[0], 'title');
    const link = tag(match[0], 'link') || tag(match[0], 'guid');
    const summary = tag(match[0], 'description').slice(0, 280);
    const item = { source: source.source, title, link, summary };
    return { ...item, score: relevance(item) };
  }).filter(item => item.title && item.link && item.score >= 2);
}

async function fetchItems() {
  const results = await Promise.allSettled(SOURCES.map(async source => parseFeed(await fetchUrl(source.url), source)));
  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []).sort((a, b) => b.score - a.score);
}

function recentTitles() {
  if (!fs.existsSync(OUT_DIR)) return [];
  return fs.readdirSync(OUT_DIR).filter(name => name.endsWith('.html')).map(name => {
    const html = fs.readFileSync(path.join(OUT_DIR, name), 'utf8');
    return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  }).map(decode);
}

function articleHtml({ topic, date, url }) {
  const citations = topic.sources.map(item => item.link);
  const schema = buildBlogPostingJsonLd({
    title: topic.title,
    description: topic.description,
    url,
    image: `${BASE_URL}/og-image.jpg`,
    datePublished: date,
    dateModified: date,
    keywords: ['crypto donations', 'humanitarian aid', 'donation transparency', 'on-chain verification'],
    citations
  });
  const sourceItems = topic.sources.map(item => `<li><a href="${escapeHtml(item.link)}" rel="noopener noreferrer">${escapeHtml(item.title)}</a> — ${escapeHtml(item.source)}</li>`).join('\n');
  const signals = topic.sources.map(item => `<li><strong>${escapeHtml(item.source)}:</strong> ${escapeHtml(item.summary || item.title)}</li>`).join('\n');
  // Briefings are published noindex: a person must review the sources and remove the
  // robots tag before the page can enter the sitemap or search results.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <!-- layout:head --><!-- /layout:head -->
  <title>${escapeHtml(topic.title)} | ALI Charity</title>
  <meta name="description" content="${escapeHtml(topic.description)}">
  <link rel="canonical" href="${url}">
  <meta name="ai-content-declaration" content="AI-assisted research and drafting; sources and methodology are disclosed; human review is required before indexing.">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <!-- layout:header --><!-- /layout:header -->
  <main id="main" class="prose"><article>
    <ol class="breadcrumb"><li><a href="/">Home</a></li><li><a href="/blog/">Guides</a></li><li aria-current="page">Briefing</li></ol>
    <p class="eyebrow">Evidence-led briefing · ${date}</p><h1>${escapeHtml(topic.title)}</h1><p class="lede">${escapeHtml(topic.description)}</p>
    <div class="answer-box"><h2>Direct answer</h2><p>Reports of humanitarian need help donors understand a crisis, but they do not verify a donation destination. Before sending crypto, confirm the organization, asset, network and complete address on its official domain, and keep the transaction record.</p></div>
    <h2>What the sources report</h2><ul>${signals}</ul>
    <h2>ALI Charity analysis</h2><p>These sources describe need and funding pressure. ALI Charity's role is narrower: a stable official-address page, network-specific safety instructions, and public records that do not overstate what a blockchain transfer proves. A transfer record is evidence of movement to an address; separate reporting is needed to demonstrate project use and outcomes.</p>
    <h2>Donor verification checklist</h2><ol><li>Confirm the publisher and date of any humanitarian claim.</li><li>Open the official donation address from the charity's own domain.</li><li>Match the asset and network, and compare the complete address, including the middle characters.</li><li>Only consider a small test after verifying the source, full recipient address, asset and network. If any check is unresolved, do not send.</li><li>Retain the transaction hash and review impact evidence separately.</li></ol>
    <h2>Sources and methodology</h2><p>Generated only when at least two independent HTTPS sources report the same situation and the topic passes a recent-coverage check. Source summaries are paraphrased; the links below are the evidence trail.</p><ul>${sourceItems}</ul>
    <div class="actions"><a class="button primary" href="/donor-safety.html">Open donor safety guidance</a></div>
  </article></main>
  <!-- layout:footer --><!-- /layout:footer -->
  <!-- layout:analytics --><!-- /layout:analytics -->
</body>
</html>`;
  return applyLayout(html, 'blog/briefings/');
}

async function main() {
  const date = process.env.PROMOTION_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  let items = [];
  try { items = await fetchItems(); } catch (error) { console.warn(`Research fetch failed: ${error.message}`); }
  const topic = chooseTopic(items, recentTitles());
  if (!topic) {
    console.log('No qualified original promotion topic; publication skipped.');
    return;
  }
  const slug = `${date}-${slugify(topic.sources[0].title)}-transparent-giving`;
  const url = `${BASE_URL}/blog/briefings/${slug}.html`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${slug}.html`);
  fs.writeFileSync(outFile, articleHtml({ topic, date, url }));
  console.log(`Generated qualified promotion article: ${path.relative(ROOT, outFile)}`);
  console.log(`Independent source domains used: ${topic.sources.length}`);
}

main().catch(error => {
  console.error(`Promotion generation failed without publication: ${error.message}`);
  process.exitCode = 1;
});
