// Generates vercel.json: redirects for retired URLs, security headers and cache policy.
// Run `node scripts/write-vercel-config.js` after editing the maps below.
const fs = require('node:fs');
const path = require('node:path');

const GUIDE_HOW_TO = '/blog/how-to-donate-cryptocurrency-guide-2026.html';
const GUIDE_PLATFORMS = '/blog/crypto-donation-platform-2026-guide.html';
const GUIDE_TRACKING = '/blog/blockchain-donation-tracking-transparency.html';

// Retired page -> closest reviewed canonical page (permanent 301/308).
const retired = {
  '/about-v2.html': '/about.html',
  '/donate-new.html': '/donate.html',
  '/donate-v2.html': '/donate.html',
  '/faq-v2.html': '/faq.html',
  '/team-v2.html': '/about.html',
  '/token-v2.html': '/token.html',
  '/team.html': '/about.html',
  '/blog/why-i-built-ali-charity.html': '/about.html',
  '/community': '/about.html',
  '/how-it-works': '/transparency.html',
  '/cookies': '/privacy.html',
  '/growth.html': '/',
  '/promotion.html': '/',
  '/blockchain-charity': GUIDE_TRACKING,
  '/crypto-donations': GUIDE_HOW_TO,
  // ALI Token legacy pages
  '/ali-token-economics.html': '/token.html',
  '/ali-token-use-cases.html': '/token.html',
  '/dao-governance.html': '/token.html',
  '/dex-launch.html': '/token.html',
  '/whitepaper.html': '/token.html',
  '/blog/ali-token-dex-launch-preparation.html': '/token.html',
  '/blog/ali-token-economics-guide.html': '/token.html',
  '/blog/ali-token-incentivizing-charitable-giving.html': '/token.html',
  // How-to duplicates
  '/crypto-donation-guide-2026.html': GUIDE_HOW_TO,
  '/how-to-donate-cryptocurrency-2026.html': GUIDE_HOW_TO,
  '/how-to-donate-cryptocurrency-to-charity-2026.html': GUIDE_HOW_TO,
  '/crypto-philanthropy-guide-for-beginners.html': GUIDE_HOW_TO,
  '/blog/how-to-donate-cryptocurrency-to-charity.html': GUIDE_HOW_TO,
  // Platform comparison duplicates
  '/best-crypto-charity-platforms-2026.html': GUIDE_PLATFORMS,
  '/best-crypto-charity-platforms.html': GUIDE_PLATFORMS,
  '/best-transparent-charity-platform.html': GUIDE_PLATFORMS,
  '/global-crypto-charity.html': GUIDE_PLATFORMS,
  '/blog/best-crypto-charity-donate-2026.html': GUIDE_PLATFORMS,
  '/blog/best-cryptocurrency-charity-platforms-2026.html': GUIDE_PLATFORMS,
  '/blog/decentralized-charity-platform-guide.html': GUIDE_PLATFORMS,
  '/blog/global-cryptocurrency-charity-worldwide.html': GUIDE_PLATFORMS,
  // Transparency / blockchain explainer duplicates
  '/blockchain-transparency-revolution.html': GUIDE_TRACKING,
  '/charity-transparency-crisis.html': GUIDE_TRACKING,
  '/blockchain-charity-donation-benefits.html': GUIDE_TRACKING,
  '/benefits-of-crypto-donations-nonprofits.html': GUIDE_TRACKING,
  '/why-donate-cryptocurrency.html': GUIDE_TRACKING,
  '/why-donate-to-blockchain-charity.html': GUIDE_TRACKING,
  '/web3-philanthropy-future.html': GUIDE_TRACKING,
  '/future-of-giving-2026.html': GUIDE_TRACKING,
  '/blog/blockchain-charity-transparency-revolution-2026.html': GUIDE_TRACKING,
  '/blog/how-blockchain-enables-transparent-charity.html': GUIDE_TRACKING,
  '/blog/the-future-of-web3-philanthropy.html': GUIDE_TRACKING,
  '/blog/web3-philanthropy-future-2026.html': GUIDE_TRACKING,
  '/blog/crypto-philanthropy-trends-2026-stablecoin-aid-transparent-giving.html': GUIDE_TRACKING,
  // Tax pages: answers states the unverified tax status explicitly
  '/blockchain-charity-tax-benefits.html': '/answers.html',
  '/blog/cryptocurrency-donation-tax-benefits-2026.html': '/answers.html',
  // Humanitarian explainers -> project routes
  '/humanitarian-aid-guide-2026.html': '/',
  '/sudan-humanitarian-crisis-blockchain-aid.html': '/',
  '/blockchain-revolutionizing-humanitarian-aid-2026.html': '/'
};

// Wildcard retirements.
const patterns = [
  { source: '/donate-v2:rest*', destination: '/donate.html' },
  { source: '/blog/news/:rest*', destination: '/blog/' },
  { source: '/blog/news.html', destination: '/blog/' },
  { source: '/blog/briefings/:rest*', destination: '/blog/' }
];

// Extensionless aliases served as the canonical .html (308 keeps one canonical URL).
const aliases = {
  '/about': '/about.html', '/contact': '/contact.html', '/donate': '/donate.html',
  '/faq': '/faq.html', '/token': '/token.html', '/transparency': '/transparency.html',
  '/answers': '/answers.html', '/safety': '/donor-safety.html', '/donor-safety': '/donor-safety.html',
  '/privacy': '/privacy.html', '/terms': '/terms.html', '/blog': '/blog/', '/zh': '/zh/'
};

const csp = [
  "default-src 'self'",
  "script-src 'self' https://geoinflow-iota.vercel.app https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://geoinflow-iota.vercel.app https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests'
].join('; ');

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  buildCommand: 'npm run build',
  outputDirectory: 'public',
  redirects: [
    { source: '/:path*', has: [{ type: 'host', value: 'www.minadoai.com' }], destination: 'https://minadoai.com/:path*', permanent: true },
    { source: '/index.html', destination: '/', permanent: true },
    ...Object.entries(retired).map(([source, destination]) => ({ source, destination, permanent: true })),
    ...patterns.map(item => ({ ...item, permanent: true })),
    ...Object.entries(aliases).map(([source, destination]) => ({ source, destination, permanent: true }))
  ],
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
      ]
    },
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }] },
    { source: '/blog/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }] },
    { source: '/(logo.png|og-image.jpg|icons.svg)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    { source: '/css/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=604800' }] },
    { source: '/js/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=604800' }] },
    { source: '/js/site-config.js', headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }] },
    { source: '/data/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' }] },
    { source: '/(llms.txt|llms-full.txt|robots.txt|sitemap.xml|feed.xml)', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }] },
    { source: '/llms(.*).txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] }
  ]
};

if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, '..', 'vercel.json'), `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Wrote vercel.json with ${config.redirects.length} redirects.`);
}

module.exports = { config, retired, aliases };
