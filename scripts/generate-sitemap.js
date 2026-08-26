const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const urls = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(absolute, 'utf8');
      if (/name=["']robots["'][^>]*noindex/i.test(html)) continue;
      const canonical = html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)/i)
        || html.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
      if (canonical && canonical[1].startsWith('https://minadoai.com/')) urls.push(canonical[1]);
    }
  }
}

visit(publicDir);
const unique = [...new Set(urls)].sort();
const today = new Date().toISOString().slice(0, 10);
const body = unique.map(url => `  <url><loc>${url.replace(/&/g, '&amp;')}</loc><lastmod>${today}</lastmod></url>`).join('\n');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
console.log(`Generated sitemap with ${unique.length} canonical URLs.`);
