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

const HUMANITARIAN_TERMS = ['aid', 'appeal', 'charity', 'cholera', 'displaced', 'disaster', 'donation', 'donor', 'drought',
  'earthquake', 'famine', 'flood', 'flooding', 'funding', 'humanitarian', 'hunger', 'malnutrition', 'refugee',
  'refugees', 'relief', 'rescue', 'shelter', 'unicef', 'wfp', 'unhcr', 'cyclone', 'outbreak', 'vaccination'];
// Politics, celebrity and incident stories are not humanitarian-giving topics even when
// they mention money or children; they must never become donor briefings.
const OFF_TOPIC_TERMS = ['wedding', 'election', 'campaign ad', 'ads', 'congresswoman', 'senator', 'trump', 'putin',
  'celebrity', 'football', 'airline', 'airlines', 'air traffic', 'stock market', 'shoe shop', 'murder', 'trial'];
const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it',
  'its', 'of', 'on', 'or', 'says', 'said', 'that', 'the', 'their', 'this', 'to', 'was', 'were', 'will', 'with', 'after',
  'amid', 'over', 'new', 'more', 'than', 'who', 'what', 'into', 'out', 'up', 'not', 'but', 'they', 'been', 'one', 'two']);

function decodeEntities(value) {
  let text = String(value || '');
  // Feeds such as The Guardian double-encode their HTML summaries; decode until stable.
  for (let pass = 0; pass < 3; pass += 1) {
    const next = text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&amp;/gi, '&');
    if (next === text) break;
    text = next;
  }
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasTerm(haystack, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, 'i').test(haystack);
}

function relevance(item) {
  const haystack = `${item && item.title} ${item && item.summary}`;
  if (OFF_TOPIC_TERMS.some(term => hasTerm(haystack, term))) return 0;
  return HUMANITARIAN_TERMS.filter(term => hasTerm(haystack, term)).length;
}

function significantTokens(item) {
  return new Set(normalizeTitle(`${item.title} ${item.summary || ''}`).split(' ')
    .filter(token => token.length > 3 && !STOPWORDS.has(token)));
}

// Supporting sources must describe the same situation as the primary story,
// not merely be another humanitarian headline from the same day.
function corroborates(primary, candidate) {
  const a = significantTokens(primary);
  const shared = [...significantTokens(candidate)].filter(token => a.has(token));
  return shared.length >= 2;
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
  const valid = (Array.isArray(items) ? items : [])
    .filter(validSource)
    .filter(item => relevance(item) >= 2)
    .sort((a, b) => relevance(b) - relevance(a));
  const byDomain = new Map();
  for (const item of valid) {
    const domain = new URL(item.link).hostname.replace(/^www\./, '');
    if (!byDomain.has(domain)) byDomain.set(domain, item);
  }
  const [primary, ...others] = [...byDomain.values()];
  if (!primary) return null;
  const sources = [primary, ...others.filter(item => corroborates(primary, item))].slice(0, 5);
  if (sources.length < 2) return null;
  // Any corroborating headline matching a recent briefing means the story was already covered.
  if (sources.some(source => recentTitles.some(title => similarity(source.title, title) >= 0.72))) return null;
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

module.exports = { buildBlogPostingJsonLd, chooseTopic, corroborates, decodeEntities, normalizeTitle, relevance, similarity };
