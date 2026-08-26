function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(?:a|an|and|the|to|of|for|in|on|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(left, right) {
  const a = new Set(normalizeTitle(left).split(' ').filter(Boolean));
  const b = new Set(normalizeTitle(right).split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(token => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}

function validSource(item) {
  try {
    const url = new URL(item && item.link);
    return url.protocol === 'https:' && Boolean(item.title) && Boolean(item.source);
  } catch {
    return false;
  }
}

function chooseTopic(items, recentTitles = []) {
  const valid = (Array.isArray(items) ? items : []).filter(validSource);
  const byDomain = new Map();
  for (const item of valid) {
    const domain = new URL(item.link).hostname.replace(/^www\./, '');
    if (!byDomain.has(domain)) byDomain.set(domain, item);
  }
  const sources = [...byDomain.values()].slice(0, 5);
  if (sources.length < 2) return null;
  const primary = sources[0];
  if (recentTitles.some(title => similarity(primary.title, title) >= 0.72)) return null;
  return {
    title: `Transparent giving under pressure: ${primary.title}`,
    description: `An evidence-led ALI Charity briefing using independent sources to explain what donors can verify before making a crypto donation.`,
    sources
  };
}

function uniqueStrings(values, normalizer = value => value) {
  const seen = new Set();
  return values.filter(value => {
    const key = normalizer(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildBlogPostingJsonLd(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: 'en',
    image: article.image,
    keywords: uniqueStrings(article.keywords || [], normalizeTitle),
    citation: uniqueStrings(article.citations || []),
    author: { '@type': 'Organization', name: 'ALI Charity' },
    publisher: {
      '@type': 'Organization',
      name: 'ALI Charity',
      logo: { '@type': 'ImageObject', url: 'https://minadoai.com/logo.png' }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.url }
  };
}

module.exports = { buildBlogPostingJsonLd, chooseTopic, normalizeTitle, similarity };
