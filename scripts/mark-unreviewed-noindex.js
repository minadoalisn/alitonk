const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../config/geo-authority.json');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const reviewed = new Set(manifest.pages.map(page => page.path === '/' ? 'index.html' : page.path.replace(/^\//, '').replace(/\/$/, '/index.html')));
const utilityFiles = new Set(['google6f5c8e7b3f5f8c1a.html']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function markNoindex(html) {
  const tag = '<meta name="robots" content="noindex, nofollow, noarchive">';
  if (/<meta\b[^>]*name=["']robots["'][^>]*>/i.test(html)) {
    return html.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/i, tag);
  }
  return html.replace(/<head(\s[^>]*)?>/i, match => `${match}\n  ${tag}`);
}

function main() {
  let changed = 0;
  for (const file of walk(publicDir).filter(file => file.endsWith('.html'))) {
    const relative = path.relative(publicDir, file).split(path.sep).join('/');
    if (reviewed.has(relative) || utilityFiles.has(relative) || relative.startsWith('blog/briefings/')) continue;
    const html = fs.readFileSync(file, 'utf8');
    const next = markNoindex(html);
    if (next !== html) {
      fs.writeFileSync(file, next);
      changed += 1;
    }
  }
  console.log(`Applied noindex policy to ${changed} unreviewed HTML files.`);
}

if (require.main === module) main();

module.exports = { markNoindex };
