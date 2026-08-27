const path = require('node:path');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pageUrl(baseUrl, pagePath) {
  return new URL(pagePath, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

function renderSitemap(manifest, extraPages = []) {
  const all = [...manifest.pages, ...extraPages];
  const unique = new Map(all.map(page => [page.path, page]));
  const rows = [...unique.values()].map(page => {
    const loc = escapeXml(pageUrl(manifest.site.baseUrl, page.path));
    return `  <url><loc>${loc}</loc><lastmod>${page.lastModified}</lastmod><changefreq>${page.changeFrequency || 'monthly'}</changefreq><priority>${page.priority || '0.5'}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

function tagText(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function metaContent(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const target = tags.find(tag => new RegExp(`(?:name|property)=["']${name}["']`, 'i').test(tag));
  if (!target) return '';
  const match = target.match(/content=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function canonicalOf(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const target = tags.find(tag => /rel=["'][^"']*canonical/i.test(tag));
  const match = target && target.match(/href=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function jsonLdTypes(html) {
  const values = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const visit = value => {
        if (!value || typeof value !== 'object') return;
        if (typeof value['@type'] === 'string') values.push(value['@type']);
        if (Array.isArray(value['@type'])) values.push(...value['@type']);
        Object.values(value).forEach(visit);
      };
      visit(data);
    } catch {}
  }
  return [...new Set(values)];
}

function readableText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#\d]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assessPage(html, expectedUrl) {
  const internalLinks = (html.match(/<a\b[^>]+href=["']\/(?!\/)/gi) || []).length;
  const wordCount = readableText(html).split(/\s+/).filter(Boolean).length;
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const checks = {
    title: tagText(html, 'title').length >= 10,
    description: metaContent(html, 'description').length >= 50,
    canonical: canonicalOf(html) === expectedUrl,
    openGraph: Boolean(metaContent(html, 'og:title') && metaContent(html, 'og:description')),
    structuredData: jsonLdTypes(html).some(type => ['Organization', 'WebSite', 'WebPage', 'Article', 'BlogPosting', 'FAQPage', 'AboutPage', 'ContactPage'].includes(type)),
    singleH1: h1Count === 1,
    internalLinks: internalLinks >= 5,
    contentDepth: wordCount >= 250
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, score: Math.round((passed / Object.keys(checks).length) * 100), wordCount, internalLinks };
}

function crawlerAllowed(robots, agent) {
  const groups = robots.split(/\r?\n\s*\r?\n/);
  const group = groups.find(block => new RegExp(`^User-agent:\\s*${agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(block));
  return Boolean(group) && !/^Disallow:\s*\/?\s*$/im.test(group);
}

function renderFeed(manifest, items, generatedAt) {
  const site = manifest.site;
  const updated = `${generatedAt}T00:00:00Z`;
  const entries = items.map(item => `  <entry>\n    <title>${escapeXml(item.title)}</title>\n    <link href="${escapeXml(item.url)}"/>\n    <id>${escapeXml(item.url)}</id>\n    <updated>${item.updated}T00:00:00Z</updated>\n    <summary>${escapeXml(item.description)}</summary>\n  </entry>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${escapeXml(site.name)} evidence-led guides</title>\n  <link href="${escapeXml(pageUrl(site.baseUrl, '/feed.xml'))}" rel="self"/>\n  <link href="${escapeXml(pageUrl(site.baseUrl, '/blog/'))}"/>\n  <id>${escapeXml(pageUrl(site.baseUrl, '/'))}</id>\n  <updated>${updated}</updated>\n${entries}\n</feed>\n`;
}

function fileForPage(publicDir, pagePath) {
  if (pagePath === '/') return path.join(publicDir, 'index.html');
  if (pagePath.endsWith('/')) return path.join(publicDir, pagePath.slice(1), 'index.html');
  return path.join(publicDir, pagePath.slice(1));
}

module.exports = { assessPage, crawlerAllowed, fileForPage, metaContent, pageUrl, renderFeed, renderSitemap, tagText };
