const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const { buildBlogPostingJsonLd, chooseTopic } = require('./lib/blog-promotion');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'blog', 'briefings');
const BASE_URL = process.env.BLOG_BASE_URL || 'https://minadoai.com';
const SOURCES = [
  { source: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml' },
  { source: 'ReliefWeb', url: 'https://reliefweb.int/updates/rss.xml' },
  { source: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' }
];
const KEYWORDS = ['aid', 'appeal', 'children', 'crisis', 'disaster', 'donation', 'funding', 'humanitarian', 'refugee', 'relief'];

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decode(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
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
    const haystack = `${title} ${summary}`.toLowerCase();
    const score = KEYWORDS.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    return { source: source.source, title, link, summary, score };
  }).filter(item => item.title && item.link && item.score >= 1);
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
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(topic.title)} | ALI Charity</title><meta name="description" content="${escapeHtml(topic.description)}"><link rel="canonical" href="${url}"><link rel="icon" href="/logo.png"><link rel="stylesheet" href="/css/home.css">
<meta name="ai-content-declaration" content="AI-assisted research and drafting; sources and methodology are disclosed and publication is quality-gated."><script type="application/ld+json">${JSON.stringify(schema)}</script></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/"><img src="/logo.png" width="42" height="42" alt=""><span>ALI Charity</span></a><nav aria-label="Primary"><a href="/blog/">Guides</a><a href="/transparency.html">Transparency</a><a class="button small" href="/donate.html">Donate</a></nav></header>
<main id="main" class="section prose"><p class="eyebrow">Evidence-led briefing · ${date}</p><h1>${escapeHtml(topic.title)}</h1><p class="lede">${escapeHtml(topic.description)}</p>
<h2>Direct answer</h2><p>Urgent humanitarian funding reports can help donors understand need, but they do not verify a donation destination. Before sending crypto, donors should independently confirm the organization, asset, network, complete address, and later transaction record.</p>
<h2>What the sources report</h2><ul>${signals}</ul>
<h2>ALI Charity analysis</h2><p>These sources describe need and funding pressure. ALI Charity's role is narrower: provide a stable official-address page, network-specific safety instructions, and public records that do not overstate what a blockchain transfer proves. A transfer record is evidence of movement to an address; separate reporting is still needed to demonstrate project use and outcomes.</p>
<h2>Donor verification checklist</h2><ol><li>Confirm the publisher and date of any humanitarian claim.</li><li>Open the official donation address from the charity's own domain.</li><li>Match the asset and network, then send a small test transfer if unsure.</li><li>Retain the transaction hash and review impact evidence separately.</li></ol>
<h2>Sources and methodology</h2><p>This briefing was generated only after finding at least two independent HTTPS source domains and passing a recent-topic similarity check. Source summaries are paraphrased; links below are the evidence trail.</p><ul>${sourceItems}</ul>
<p><a class="button" href="/donor-safety.html">Open donor safety guidance</a></p></main><footer><p>ALI Charity · Source-linked editorial briefing.</p></footer></body></html>`;
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
