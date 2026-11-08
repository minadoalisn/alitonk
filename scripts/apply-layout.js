// Fills shared layout regions in every public HTML page so navigation, footer,
// head essentials and analytics stay identical site-wide. Idempotent: pages keep
// marker comments and the content between them is regenerated on each build.
//
//   <!-- layout:head --><!-- /layout:head -->            (inside <head>)
//   <!-- layout:header --><!-- /layout:header -->        (first thing in <body>)
//   <!-- layout:footer --><!-- /layout:footer -->        (after </main>)
//   <!-- layout:analytics --><!-- /layout:analytics -->  (just before </body>)
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const SKIP = new Set(['google6f5c8e7b3f5f8c1a.html']);
const GEOINFLOW_ID = 'cd655736-2ad1-4f5e-8bb5-23c43b3655e2';

// `menu` is the longer label used in the mobile menu, so each destination has one
// short desktop label and one descriptive mobile label.
const PRIMARY = [
  { href: '/#projects', label: 'Projects', menu: 'Project routes', match: [] },
  { href: '/transparency.html', label: 'Transparency', menu: 'Transparency method', match: ['transparency.html'] },
  { href: '/donor-safety.html', label: 'Safety', menu: 'Donor safety', match: ['donor-safety.html'] },
  { href: '/answers.html', label: 'Answers', menu: 'Verified answers', match: ['answers.html', 'faq.html'] },
  { href: '/blog/', label: 'Guides', menu: 'Donor guides', match: ['blog/'] }
];
const MENU_EXTRA = [
  { href: '/about.html', label: 'About', match: ['about.html'] },
  { href: '/token.html', label: 'ALI Token', match: ['token.html'] },
  { href: '/faq.html', label: 'FAQ', match: ['faq.html'] },
  { href: '/contact.html', label: 'Contact', match: ['contact.html'] },
  { href: '/zh/', label: '中文', match: ['zh/'], lang: 'zh-Hans' }
];

function isCurrent(item, file) {
  return item.match.some(prefix => (prefix.endsWith('/') ? file.startsWith(prefix) : file === prefix));
}

function link(item, file, label = item.label) {
  const current = isCurrent(item, file) ? ' aria-current="page"' : '';
  const lang = item.lang ? ` lang="${item.lang}" hreflang="${item.lang}"` : '';
  return `<a href="${item.href}"${current}${lang}>${label}</a>`;
}

function head() {
  return [
    '<meta name="theme-color" content="#102033" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#0b1724" media="(prefers-color-scheme: dark)">',
    '<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="stylesheet" href="/css/site.css">',
    '<link rel="alternate" type="application/atom+xml" title="ALI Charity evidence-led guides" href="/feed.xml">',
    '<link rel="alternate" type="text/plain" title="LLM-readable site summary" href="/llms.txt">'
  ].join('\n  ');
}

function header(file) {
  const primary = PRIMARY.map(item => link(item, file)).join('');
  const menu = [...PRIMARY, ...MENU_EXTRA].map(item => link(item, file, item.menu || item.label)).join('');
  return `<header class="site-header">
    <nav class="nav" aria-label="Primary navigation">
      <a class="brand" href="/"><img src="/assets/images/logo-64.png" width="32" height="32" alt=""><span>ALI Charity</span></a>
      <div class="nav-links">${primary}</div>
      <a class="nav-action" href="/donate.html#donation">Donate crypto</a>
      <details class="nav-menu"><summary aria-label="Menu"><span></span></summary><div class="nav-menu-panel">${menu}<a class="menu-donate" href="/donate.html#donation">Donate crypto</a></div></details>
    </nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><a class="brand" href="/"><img src="/assets/images/logo-64.png" width="32" height="32" alt="" loading="lazy"><span>ALI Charity</span></a><p>Official crypto donation addresses, donor-safety guidance and public records — without ever connecting to your wallet.</p></div>
    <nav aria-labelledby="footer-give"><h2 id="footer-give">Give</h2><ul><li><a href="/donate.html">Donate crypto</a></li><li><a href="/donor-safety.html">Verify addresses</a></li><li><a href="/giving-tuesday.html">Crypto Giving Tuesday</a></li><li><a href="/data/donations.json">Public donation data</a></li></ul></nav>
    <nav aria-labelledby="footer-learn"><h2 id="footer-learn">Learn</h2><ul><li><a href="/answers.html">Verified answers</a></li><li><a href="/faq.html">FAQ</a></li><li><a href="/blog/">Donor guides</a></li><li><a href="/transparency.html">Transparency method</a></li></ul></nav>
    <nav aria-labelledby="footer-org"><h2 id="footer-org">Organization</h2><ul><li><a href="/about.html">About</a></li><li><a href="/token.html">ALI Token</a></li><li><a href="/contact.html">Contact</a></li><li><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></li><li><a href="/zh/" lang="zh-Hans" hreflang="zh-Hans">中文简介</a></li></ul></nav>
    <p class="footer-note"><span>© <span id="year">2026</span> ALI Charity. We never ask for a seed phrase, private key or wallet connection.</span><span><a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">Sitemap</a> · <a href="/feed.xml">Feed</a></span></p>
  </footer>`;
}

function analytics() {
  return [
    `<script defer src="https://geoinflow-iota.vercel.app/script.js" data-website-id="${GEOINFLOW_ID}"></script>`,
    '<script defer src="/_vercel/insights/script.js"></script>',
    '<script defer src="/_vercel/speed-insights/script.js"></script>'
  ].join('\n  ');
}

function fill(html, name, content) {
  const pattern = new RegExp(`<!-- layout:${name} -->[\\s\\S]*?<!-- /layout:${name} -->`);
  return html.replace(pattern, `<!-- layout:${name} -->\n  ${content}\n  <!-- /layout:${name} -->`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function applyLayout(html, file) {
  let next = fill(html, 'head', head());
  next = fill(next, 'header', header(file));
  next = fill(next, 'footer', footer());
  next = fill(next, 'analytics', analytics());
  return next;
}

function main() {
  const missing = [];
  let changed = 0;
  for (const absolute of walk(publicDir).filter(file => file.endsWith('.html'))) {
    const file = path.relative(publicDir, absolute).split(path.sep).join('/');
    if (SKIP.has(file)) continue;
    const html = fs.readFileSync(absolute, 'utf8');
    for (const region of ['head', 'header', 'footer', 'analytics']) {
      if (!html.includes(`<!-- layout:${region} -->`)) missing.push(`${file}: ${region}`);
    }
    const next = applyLayout(html, file);
    if (next !== html) { fs.writeFileSync(absolute, next); changed += 1; }
  }
  if (missing.length) {
    console.error(`Pages missing layout markers:\n  ${missing.join('\n  ')}`);
    process.exitCode = 1;
  }
  console.log(`Applied shared layout to ${changed} page(s).`);
}

if (require.main === module) main();

module.exports = { applyLayout, header, footer };
