const test = require('node:test');
const assert = require('node:assert/strict');

const { chooseTopic, buildBlogPostingJsonLd, decodeEntities, normalizeTitle, relevance } = require('../scripts/lib/blog-promotion');

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
    { source: 'UN News', title: 'Aid cuts deepen hunger crisis in Somalia', link: 'https://news.un.org/a' },
    { source: 'WFP', title: 'Somalia hunger crisis worsens as aid funding falls', link: 'https://wfp.org/b' }
  ];
  assert.equal(chooseTopic(items, ['Aid cuts deepen the hunger crisis']), null);
});

test('selects a qualified topic from independent HTTPS sources', () => {
  const topic = chooseTopic([
    { source: 'UN News', title: 'Sudan aid corridors need humanitarian funding', link: 'https://news.un.org/a' },
    { source: 'WFP', title: 'Sudan funding gaps delay humanitarian food aid corridors', link: 'https://wfp.org/b' }
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

test('word fragments and political or celebrity stories never qualify as humanitarian topics', () => {
  assert.equal(relevance({ title: 'Putin ally paid for some wedding festivities', summary: 'The couple said it was a gift.' }), 0);
  assert.equal(relevance({ title: 'Airlines criticise air traffic control glitch', summary: 'Flights were delayed, officials said.' }), 0);
  assert.ok(relevance({ title: 'Flooding displaces thousands', summary: 'Humanitarian relief appeal launched.' }) >= 2);
});

test('unrelated headlines cannot pose as corroborating sources', () => {
  const topic = chooseTopic([
    { source: 'UN News', title: 'Somalia: humanitarian aid cuts leave children facing hunger', summary: 'Aid programmes shut.', link: 'https://news.un.org/a' },
    { source: 'BBC', title: 'Children missing after ferry sinks; rescue and relief under way', summary: 'Eight people died.', link: 'https://bbc.co.uk/b' }
  ], []);
  assert.equal(topic, null);
});

test('double-encoded feed summaries decode to plain text', () => {
  assert.equal(decodeEntities('&amp;lt;p&amp;gt;Drive to save &amp;amp; help&amp;lt;/p&amp;gt;'), 'Drive to save & help');
  assert.equal(decodeEntities('Six weeks after&amp;nbsp;the floods'), 'Six weeks after the floods');
});
