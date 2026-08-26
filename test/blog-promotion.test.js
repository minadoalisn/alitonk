const test = require('node:test');
const assert = require('node:assert/strict');

const { chooseTopic, buildBlogPostingJsonLd, normalizeTitle } = require('../scripts/lib/blog-promotion');

test('does not publish without enough independent sources', () => {
  assert.equal(chooseTopic([], []), null);
  assert.equal(chooseTopic([{ source: 'A', title: 'One', link: 'https://a.example/one' }], []), null);
  assert.equal(chooseTopic([
    { source: 'A', title: 'One', link: 'https://a.example/one' },
    { source: 'A mirror', title: 'Two', link: 'https://a.example/two' }
  ], []), null);
});

test('rejects a near-duplicate recent topic', () => {
  const items = [
    { source: 'UN News', title: 'Aid cuts deepen hunger crisis', link: 'https://news.un.org/a' },
    { source: 'WFP', title: 'Funding gap threatens food support', link: 'https://wfp.org/b' }
  ];
  assert.equal(chooseTopic(items, ['Aid cuts deepen the hunger crisis']), null);
});

test('selects a qualified topic from independent HTTPS sources', () => {
  const topic = chooseTopic([
    { source: 'UN News', title: 'Aid corridors need transparent funding', link: 'https://news.un.org/a' },
    { source: 'WFP', title: 'Funding gaps delay emergency food support', link: 'https://wfp.org/b' }
  ], []);
  assert.ok(topic);
  assert.equal(topic.sources.length, 2);
  assert.match(topic.title, /transparent/i);
});

test('BlogPosting uses citation URLs and deduplicated keywords', () => {
  const schema = buildBlogPostingJsonLd({
    title: 'Transparent Giving Under Funding Pressure',
    description: 'An evidence-led donor briefing.',
    url: 'https://minadoai.com/blog/transparent-giving.html',
    image: 'https://minadoai.com/og-image.jpg',
    datePublished: '2026-08-26',
    dateModified: '2026-08-26',
    keywords: ['crypto donations', 'Crypto Donations', 'transparency'],
    citations: ['https://news.un.org/a', 'https://wfp.org/b', 'https://news.un.org/a']
  });
  assert.equal(schema['@type'], 'BlogPosting');
  assert.deepEqual(schema.citation, ['https://news.un.org/a', 'https://wfp.org/b']);
  assert.equal(new Set(schema.keywords.map(normalizeTitle)).size, schema.keywords.length);
});
