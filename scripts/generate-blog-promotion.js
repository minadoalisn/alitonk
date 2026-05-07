const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const NEWS_DIR = path.join(PUBLIC_DIR, 'blog', 'news');
const BLOG_INDEX = path.join(PUBLIC_DIR, 'blog', 'news.html');
const BLOG_SITEMAP = path.join(PUBLIC_DIR, 'blog', 'sitemap.xml');
const BASE_URL = process.env.BLOG_BASE_URL || 'https://minadoai.com';
const DEFAULT_ARTICLE_IMAGE = '/blog/assets/daily-crypto-aid-briefing.jpg';
const DEFAULT_ARTICLE_IMAGE_SMALL = '/blog/assets/daily-crypto-aid-briefing-sm.jpg';

const NEWS_SOURCES = [
  {
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    category: 'crypto markets and regulation'
  },
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'digital assets and policy'
  },
  {
    name: 'UN News - Humanitarian Aid',
    url: 'https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml',
    category: 'humanitarian aid and international relief'
  }
];

const HOT_KEYWORDS = [
  'aid',
  'bitcoin',
  'blockchain',
  'charity',
  'crypto',
  'digital asset',
  'donation',
  'etf',
  'funding',
  'humanitarian',
  'policy',
  'refugee',
  'regulation',
  'relief',
  'stablecoin',
  'token',
  'usdt',
  'web3'
];

const FALLBACK_TOPICS = [
  {
    slug: 'transparent-crypto-donations-for-nonprofits',
    title: 'Transparent Crypto Donations for Nonprofits: A Practical Giving Model',
    description: 'A donor-friendly guide to transparent crypto donations, on-chain records, and how ALI Charity turns blockchain visibility into trust.',
    keyword: 'transparent crypto donations',
    tags: ['Crypto Donations', 'Transparency', 'Nonprofits'],
    angle: 'Donors want proof, not vague promises. Blockchain records help nonprofits show where funds move and why each transfer matters.'
  },
  {
    slug: 'blockchain-charity-platform-trust',
    title: 'How Blockchain Charity Platforms Build Donor Trust',
    description: 'Learn how public transaction records, project reporting, and donor rewards can improve trust in digital charity campaigns.',
    keyword: 'blockchain charity platform',
    tags: ['Blockchain Charity', 'Donor Trust', 'Web3'],
    angle: 'Trust grows when donors can verify records themselves instead of waiting for a yearly report.'
  },
  {
    slug: 'web3-philanthropy-donor-rewards',
    title: 'Web3 Philanthropy and Donor Rewards: Why Utility Matters',
    description: 'A soft promotion article explaining how donor rewards can support community participation without hiding the core charity mission.',
    keyword: 'web3 philanthropy',
    tags: ['Web3 Philanthropy', 'ALI Token', 'Community'],
    angle: 'Rewards should reinforce giving, transparency, and participation rather than distract from the humanitarian mission.'
  },
  {
    slug: 'on-chain-donation-tracking-guide',
    title: 'On-Chain Donation Tracking: What Donors Should Look For',
    description: 'A practical article for crypto donors who want to verify donation flows, project accountability, and public charity records.',
    keyword: 'on-chain donation tracking',
    tags: ['Donation Tracking', 'BSC', 'Accountability'],
    angle: 'A good donation platform makes verification simple enough that any donor can follow the trail.'
  }
];

function isoDate(date = new Date()) {
  const timeZone = process.env.PROMOTION_TIME_ZONE || 'Asia/Shanghai';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function displayDate(dateString) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeEntities(value) {
  return String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function truncate(value, maxLength) {
  const clean = String(value).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}...`;
}

function fetchUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('http://') ? http : https;
    const request = client.get(url, {
      headers: {
        'User-Agent': 'ALI-Charity-Promotion-Bot/1.0 (+https://minadoai.com)'
      },
      timeout: 20000
    }, (response) => {
      const location = response.headers.location;
      if (location && response.statusCode >= 300 && response.statusCode < 400 && redirects < 4) {
        response.resume();
        const nextUrl = new URL(location, url).toString();
        resolve(fetchUrl(nextUrl, redirects + 1));
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => resolve(body));
    });

    request.on('timeout', () => {
      request.destroy(new Error(`Timed out fetching ${url}`));
    });
    request.on('error', reject);
  });
}

function getTag(itemXml, tagName) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = itemXml.match(pattern);
  return match ? stripTags(match[1]) : '';
}

function parseRssItems(xml, source) {
  const matches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 12);
  return matches.map((match) => {
    const itemXml = match[0];
    const title = getTag(itemXml, 'title');
    const link = getTag(itemXml, 'link') || getTag(itemXml, 'guid');
    const summary = truncate(getTag(itemXml, 'description'), 220);
    const pubDate = getTag(itemXml, 'pubDate');
    const scoreText = `${title} ${summary}`.toLowerCase();
    const score = HOT_KEYWORDS.reduce((total, keyword) => total + (scoreText.includes(keyword) ? 1 : 0), 0);

    return {
      title,
      link,
      summary,
      pubDate,
      source: source.name,
      sourceCategory: source.category,
      score
    };
  }).filter((item) => item.title && item.link);
}

async function fetchHotItems() {
  const results = await Promise.allSettled(NEWS_SOURCES.map(async (source) => {
    const xml = await fetchUrl(source.url);
    return parseRssItems(xml, source);
  }));

  const allItems = results
    .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .sort((a, b) => b.score - a.score);
  const bySource = new Map();

  for (const item of allItems) {
    if (!bySource.has(item.source)) {
      bySource.set(item.source, item);
    }
  }

  const diversified = [...bySource.values()];
  const seen = new Set(diversified.map((item) => item.link));

  for (const item of allItems) {
    if (diversified.length >= 6) break;
    if (!seen.has(item.link)) {
      diversified.push(item);
      seen.add(item.link);
    }
  }

  return diversified.slice(0, 6);
}

function pickFallbackTopic(dateString) {
  const dayNumber = Number(dateString.replace(/-/g, ''));
  return FALLBACK_TOPICS[dayNumber % FALLBACK_TOPICS.length];
}

function buildTopicFromHotItems(dateString, hotItems) {
  const primary = hotItems[0];
  if (!primary) return pickFallbackTopic(dateString);

  const keyword = primary.title.toLowerCase().includes('humanitarian') || primary.title.toLowerCase().includes('aid')
    ? 'crypto donations for humanitarian aid'
    : 'crypto charity transparency';
  const titleCore = truncate(primary.title.replace(/[|].*$/, ''), 82);

  return {
    slug: `${slugify(titleCore)}-charity-transparency`,
    title: `${titleCore}: Why Transparent Crypto Giving Matters`,
    description: `A daily ALI Charity briefing connecting ${primary.source} headlines with transparent crypto donations, international giving, and on-chain accountability.`,
    keyword,
    tags: ['Crypto News', 'Humanitarian Aid', 'Transparent Giving'],
    angle: 'Today’s crypto and international aid headlines point to the same donor question: how can supporters verify that money moves quickly, publicly, and toward real-world needs?'
  };
}

function sourceListHtml(hotItems) {
  if (!hotItems.length) {
    return '<p>No live RSS headlines were available during generation, so this article used the evergreen ALI Charity promotion brief.</p>';
  }

  return `<ul>
${hotItems.map((item) => `            <li><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a> <span class="tag">${escapeHtml(item.source)}</span></li>`).join('\n')}
        </ul>`;
}

function imageAlt(topic) {
  return `Original ALI Charity illustration for ${topic.keyword}, transparent crypto donations, and humanitarian aid`;
}

function articleHtml({ dateString, topic, slug, hotItems }) {
  const prettyDate = displayDate(dateString);
  const tagLinks = topic.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ');
  const sourceJson = hotItems.map((item) => ({
    '@type': 'ListItem',
    name: item.title,
    url: item.link
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(topic.title)} | ALI Charity Blog</title>
    <meta name="description" content="${escapeHtml(topic.description)}">
    <meta name="keywords" content="${escapeHtml(topic.keyword)}, ALI Charity, crypto charity, blockchain donations, humanitarian aid, international giving">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="ai-content-declaration" content="AI-assisted editorial summary with source links and ALI Charity promotional context.">
    <link rel="canonical" href="${BASE_URL}/blog/news/${slug}.html">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${BASE_URL}/blog/news/${slug}.html">
    <meta property="og:title" content="${escapeHtml(topic.title)}">
    <meta property="og:description" content="${escapeHtml(topic.description)}">
    <meta property="og:image" content="${BASE_URL}${DEFAULT_ARTICLE_IMAGE}">
    <meta property="og:site_name" content="ALI Charity Blog">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${BASE_URL}${DEFAULT_ARTICLE_IMAGE}">
    <link rel="stylesheet" href="/css/blog-index.css">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(topic.title)},
      "description": ${JSON.stringify(topic.description)},
      "datePublished": "${dateString}",
      "dateModified": "${dateString}",
      "keywords": ${JSON.stringify([topic.keyword, ...topic.tags, 'ALI Charity', 'on-chain donations'])},
      "author": {
        "@type": "Organization",
        "name": "ALI Charity"
      },
      "publisher": {
        "@type": "Organization",
        "name": "ALI Charity",
        "logo": {
          "@type": "ImageObject",
          "url": "https://minadoai.com/logo.png"
        }
      },
      "mainEntityOfPage": "${BASE_URL}/blog/news/${slug}.html",
      "mentions": ${JSON.stringify(sourceJson)}
    }
    </script>
</head>
<body>
    <header>
        <h1>${escapeHtml(topic.title)}</h1>
        <p class="subtitle">${escapeHtml(topic.description)}</p>
        <nav class="breadcrumb">
            <a href="/">Home</a> / <a href="/blog/">Blog</a> / Daily Briefing
        </nav>
    </header>

    <div class="container">
        <article class="news-item">
            <time datetime="${dateString}">${prettyDate}</time>
            <figure class="article-figure">
                <picture>
                    <source media="(max-width: 700px)" srcset="${DEFAULT_ARTICLE_IMAGE_SMALL}">
                    <img src="${DEFAULT_ARTICLE_IMAGE}" width="1200" height="675" alt="${escapeHtml(imageAlt(topic))}" loading="eager" decoding="async">
                </picture>
                <figcaption>Original ALI Charity generated image, compressed for fast global access.</figcaption>
            </figure>
            <p><strong>${escapeHtml(topic.angle)}</strong></p>
            <p>ALI Charity tracks crypto, regulation, and humanitarian aid headlines because donors increasingly make decisions in real time. Market news affects which assets people hold, policy news affects how nonprofits can receive digital assets, and international relief news shows where transparent giving may matter most.</p>
            <p>For readers searching for ${escapeHtml(topic.keyword)}, the core issue is verification. A donation page should not simply ask for trust. It should point donors to public wallet records, clear project reporting, and repeatable evidence that funds can be followed after a gift is made.</p>
            <p>That is the soft promotion behind ALI Charity: crypto donors can support humanitarian projects while using blockchain records as a public accountability layer. The message is simple enough for search engines, AI answer engines, and human readers to understand: transparent giving is more credible when it is visible on-chain.</p>

            <h2>Today’s Source Signals</h2>
            ${sourceListHtml(hotItems)}

            <h2>Why This Matters For International Giving</h2>
            <p>When digital assets, stablecoins, and cross-border aid appear in the same news cycle, donors need a giving model that is fast but still accountable. ALI Charity positions blockchain donations as a practical bridge: global access, public transaction trails, and project-level storytelling in one place.</p>
            <p>${tagLinks}</p>
            <p><a href="https://minadoai.com/donate.html" class="btn">Donate Crypto with ALI Charity</a></p>
        </article>
    </div>

    <footer>
        <p>&copy; 2026 ALI Charity. Daily crypto and humanitarian giving briefings with transparent blockchain records.</p>
    </footer>
</body>
</html>
`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function updateBlogIndex({ dateString, topic, slug }) {
  if (!fs.existsSync(BLOG_INDEX)) return;

  const html = fs.readFileSync(BLOG_INDEX, 'utf8');
  const href = `/blog/news/${slug}.html`;
  if (html.includes(href)) return;

  const card = `            
            <article class="news-item">
                <time datetime="${dateString}">${displayDate(dateString)}</time>
                <img class="news-thumb" src="${DEFAULT_ARTICLE_IMAGE_SMALL}" width="640" height="360" alt="${escapeHtml(imageAlt(topic))}" loading="lazy" decoding="async">
                <h3><a href="${href}">
                    ${escapeHtml(topic.title)}
                </a></h3>
                <p>${escapeHtml(topic.description)}</p>
                ${topic.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ')}
            </article>
`;

  const updated = html.replace(/(<section class="latest-news">\s*<h2>.*?<\/h2>\s*)/s, `$1${card}`);
  fs.writeFileSync(BLOG_INDEX, updated);
}

function updateSitemap({ dateString, slug }) {
  if (!fs.existsSync(BLOG_SITEMAP)) return;

  const loc = `${BASE_URL}/blog/news/${slug}.html`;
  const xml = fs.readFileSync(BLOG_SITEMAP, 'utf8');
  if (xml.includes(loc)) return;

  const entry = `    <url>
        <loc>${loc}</loc>
        <lastmod>${dateString}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
`;

  fs.writeFileSync(BLOG_SITEMAP, xml.replace('</urlset>', `${entry}</urlset>`));
}

async function main() {
  const dateString = process.env.PROMOTION_DATE || isoDate();
  const hotItems = await fetchHotItems();
  const topic = buildTopicFromHotItems(dateString, hotItems);
  const slug = `${dateString}-${topic.slug}`;
  const outFile = path.join(NEWS_DIR, `${slug}.html`);

  ensureDir(NEWS_DIR);

  if (!fs.existsSync(outFile)) {
    fs.writeFileSync(outFile, articleHtml({ dateString, topic, slug, hotItems }));
  }

  updateBlogIndex({ dateString, topic, slug });
  updateSitemap({ dateString, slug });

  console.log(`Generated promotion article: ${path.relative(ROOT, outFile)}`);
  console.log(`Live source items used: ${hotItems.length}`);
}

main().catch((error) => {
  console.warn(`Live source generation warning: ${error.message}`);
  const dateString = process.env.PROMOTION_DATE || isoDate();
  const topic = pickFallbackTopic(dateString);
  const slug = `${dateString}-${topic.slug}`;
  const outFile = path.join(NEWS_DIR, `${slug}.html`);

  ensureDir(NEWS_DIR);

  if (!fs.existsSync(outFile)) {
    fs.writeFileSync(outFile, articleHtml({ dateString, topic, slug, hotItems: [] }));
  }

  updateBlogIndex({ dateString, topic, slug });
  updateSitemap({ dateString, slug });
  console.log(`Generated fallback promotion article: ${path.relative(ROOT, outFile)}`);
});
