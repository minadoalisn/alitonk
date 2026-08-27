const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../config/geo-authority.json');
const { renderSitemap } = require('./lib/geo-discovery');

const root = path.join(__dirname, '..');
const briefingsDir = path.join(root, 'public', 'blog', 'briefings');

function briefingPages() {
  if (!fs.existsSync(briefingsDir)) return [];
  return fs.readdirSync(briefingsDir)
    .filter(name => name.endsWith('.html'))
    .map(name => {
      const html = fs.readFileSync(path.join(briefingsDir, name), 'utf8');
      const date = (html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
      return date ? { path: `/blog/briefings/${name}`, lastModified: date, priority: '0.65', changeFrequency: 'monthly' } : null;
    })
    .filter(Boolean);
}

const sitemap = renderSitemap(manifest, briefingPages());
fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemap);
console.log(`Generated reviewed sitemap with ${(sitemap.match(/<url>/g) || []).length} canonical URLs.`);
