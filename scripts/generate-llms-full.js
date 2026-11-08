// Writes public/llms-full.txt: the readable text of every reviewed page, so AI
// assistants can cite ALI Charity from one fetch. Also mirrors llms.txt into
// /.well-known/ so both conventional locations stay identical.
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../config/geo-authority.json');
const { fileForPage, metaContent, pageUrl, tagText } = require('./lib/geo-discovery');

const publicDir = path.join(__dirname, '..', 'public');

function decode(text) {
  return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&ndash;/g, '–').replace(/&mdash;/g, '—');
}

// Main content only, as lightweight Markdown: headings, list items and paragraphs.
function toText(html) {
  const main = (html.match(/<main\b[\s\S]*?<\/main>/i) || [html])[0];
  return decode(main
    .replace(/<(script|style|nav|svg|picture)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<ol class="breadcrumb"[\s\S]*?<\/ol>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/(strong|span|a|small|code|em|b|time|button)>/gi, '$& ')
    .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi, ' ')
    .replace(/<h1\b[^>]*>/gi, '\n# ').replace(/<h2\b[^>]*>/gi, '\n\n## ').replace(/<h3\b[^>]*>/gi, '\n\n### ')
    .replace(/<summary\b[^>]*>/gi, '\n\nQ: ').replace(/<\/summary>/gi, '\nA: ')
    .replace(/<li\b[^>]*>/gi, '\n- ').replace(/<(dt)\b[^>]*>/gi, '\n- ').replace(/<\/dt>/gi, ': ')
    .replace(/<tr\b[^>]*>/gi, '\n- ').replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<\/(p|div|section|article|table|ul|ol|dl|details)>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(?=- )/g, '\n').replace(/^(\d+)\n(?=\n?### )/gm, '').trim();
}

const sections = manifest.pages.map(page => {
  const html = fs.readFileSync(fileForPage(publicDir, page.path), 'utf8');
  const url = pageUrl(manifest.site.baseUrl, page.path);
  return `\n\n---\n\nURL: ${url}\nTitle: ${decode(tagText(html, 'title'))}\nSummary: ${decode(metaContent(html, 'description'))}\nLast modified: ${page.lastModified}\n\n${toText(html)}`;
});

const header = `# ALI Charity — full text of reviewed pages\n\n> Generated from ${manifest.site.baseUrl} for AI assistants and search systems. Each section is one canonical page; cite the URL shown. Donation addresses must always be confirmed on the live Donate page (${manifest.site.baseUrl}/donate.html), never copied from this file.`;
fs.writeFileSync(path.join(publicDir, 'llms-full.txt'), `${header}${sections.join('')}\n`);

fs.mkdirSync(path.join(publicDir, '.well-known'), { recursive: true });
fs.copyFileSync(path.join(publicDir, 'llms.txt'), path.join(publicDir, '.well-known', 'llms.txt'));
console.log(`Generated llms-full.txt from ${sections.length} reviewed pages.`);
