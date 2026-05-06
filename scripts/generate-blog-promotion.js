const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const NEWS_DIR = path.join(PUBLIC_DIR, 'blog', 'news');
const BLOG_INDEX = path.join(PUBLIC_DIR, 'blog', 'news.html');
const BLOG_SITEMAP = path.join(PUBLIC_DIR, 'blog', 'sitemap.xml');
const BASE_URL = process.env.BLOG_BASE_URL || 'https://minadoai.com';

const topics = [
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
  return date.toISOString().slice(0, 10);
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

function pickTopic(dateString) {
  const dayNumber = Number(dateString.replace(/-/g, ''));
  return topics[dayNumber % topics.length];
}

function articleHtml({ dateString, topic, slug }) {
  const prettyDate = displayDate(dateString);
  const tagLinks = topic.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(topic.title)} | ALI Charity Blog</title>
    <meta name="description" content="${escapeHtml(topic.description)}">
    <meta name="keywords" content="${escapeHtml(topic.keyword)}, ALI Charity, crypto charity, blockchain donations">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${BASE_URL}/blog/news/${slug}.html">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${BASE_URL}/blog/news/${slug}.html">
    <meta property="og:title" content="${escapeHtml(topic.title)}">
    <meta property="og:description" content="${escapeHtml(topic.description)}">
    <meta property="og:site_name" content="ALI Charity Blog">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="/css/blog-index.css">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(topic.title)},
      "description": ${JSON.stringify(topic.description)},
      "datePublished": "${dateString}",
      "dateModified": "${dateString}",
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
      "mainEntityOfPage": "${BASE_URL}/blog/news/${slug}.html"
    }
    </script>
</head>
<body>
    <header>
        <h1>${escapeHtml(topic.title)}</h1>
        <p class="subtitle">${escapeHtml(topic.description)}</p>
        <nav class="breadcrumb">
            <a href="/">Home</a> / <a href="/blog/">Blog</a> / Promotion
        </nav>
    </header>

    <div class="container">
        <article class="news-item">
            <time datetime="${dateString}">${prettyDate}</time>
            <p><strong>${escapeHtml(topic.angle)}</strong></p>
            <p>For donors searching for ${escapeHtml(topic.keyword)}, the strongest signal is not a slogan. It is a public record. ALI Charity uses blockchain-based donation tracking so supporters can review transactions, compare project activity, and understand how digital assets move toward humanitarian work.</p>
            <p>This model is especially useful for crypto-native donors who already expect transparency from wallets, explorers, and decentralized applications. Instead of asking donors to trust a black box, ALI Charity points them toward visible records, clear project pages, and a donation experience built around verification.</p>
            <p>Soft promotion works best when it teaches first. That is why each article in this series focuses on one practical problem: donor confidence, nonprofit accountability, transparent reporting, or crypto giving education. The goal is to help readers make a better decision before they donate.</p>
            <p>Supporters can explore active projects, review donation options, and learn more about ALI token rewards on the main platform.</p>
            <p>${tagLinks}</p>
            <p><a href="https://minadoai.com/donate.html" class="btn">Donate Crypto with ALI Charity</a></p>
        </article>
    </div>

    <footer>
        <p>&copy; 2026 ALI Charity. Transparent giving with public blockchain records.</p>
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

function main() {
  const dateString = process.env.PROMOTION_DATE || isoDate();
  const topic = pickTopic(dateString);
  const slug = `${dateString}-${topic.slug}`;
  const outFile = path.join(NEWS_DIR, `${slug}.html`);

  ensureDir(NEWS_DIR);

  if (!fs.existsSync(outFile)) {
    fs.writeFileSync(outFile, articleHtml({ dateString, topic, slug }));
  }

  updateBlogIndex({ dateString, topic, slug });
  updateSitemap({ dateString, slug });

  console.log(`Generated promotion article: ${path.relative(ROOT, outFile)}`);
}

main();
