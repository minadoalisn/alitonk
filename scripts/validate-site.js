const path = require('node:path');
const { validateSite } = require('./lib/site-validation');

const redirects = {
  '/about': '/about.html',
  '/contact': '/contact.html',
  '/donate': '/donate.html',
  '/faq': '/faq.html',
  '/token': '/token.html',
  '/blog': '/blog/',
  '/blog/news.html': '/blog/',
  '/blockchain-charity': '/blog/blockchain-donation-tracking-transparency.html',
  '/crypto-donations': '/blog/how-to-donate-cryptocurrency-to-charity.html',
  '/community': '/about.html',
  '/how-it-works': '/transparency.html',
  '/transparency': '/transparency.html',
  '/cookies': '/privacy.html',
  '/about-v2.html': '/about.html',
  '/donate-new.html': '/donate.html',
  '/donate-v2.html': '/donate.html',
  '/faq-v2.html': '/faq.html',
  '/team-v2.html': '/team.html',
  '/token-v2.html': '/token.html'
};

const publicDir = path.join(__dirname, '..', 'public');
const result = validateSite(publicDir, redirects);

for (const warning of result.warnings) console.warn(`WARN ${warning}`);
for (const error of result.errors) console.error(`ERROR ${error}`);

if (result.errors.length) {
  console.error(`Site validation failed with ${result.errors.length} error(s) across ${result.files.length} files.`);
  process.exitCode = 1;
} else {
  console.log(`Site validation passed: ${result.files.length} files, 0 errors.`);
}
