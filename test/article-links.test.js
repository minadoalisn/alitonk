const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const css = fs.readFileSync(path.join(publicDir, 'css', 'home.css'), 'utf8');

test('article card styling is scoped to direct links, not inline evidence links', () => {
  assert.doesNotMatch(css, /\.article-list\s+a\s*\{/,
    'Nested links must not inherit card padding, borders or removed underlines');
  const card = css.match(/\.article-list\s*>\s*a\s*\{([^}]+)\}/);
  assert.ok(card, 'Direct homepage card links must retain their own style');
  for (const rule of [/padding:\s*24px/, /border:\s*1px solid var\(--line\)/,
    /border-radius:\s*var\(--radius\)/, /text-decoration:\s*none/]) {
    assert.match(card[1], rule);
  }
});

test('campaign verification links remain normal linked text inside paragraphs', () => {
  const html = fs.readFileSync(path.join(publicDir, 'giving-tuesday.html'), 'utf8');
  const faq = html.match(/<section\b[^>]*aria-labelledby="faq-title"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(faq);
  const paragraphs = [...faq[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1]);
  const links = [...paragraphs.join('').matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
  assert.equal(links.length, 5);
  assert.deepEqual([...new Set(links.map(match => match[1]))].sort(), [
    '/donate.html#donation',
    '/transparency.html',
    'https://www.irs.gov/charities-non-profits/tax-exempt-organization-search',
    'https://www.irs.gov/publications/p526'
  ].sort());
});
