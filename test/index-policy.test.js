const test = require('node:test');
const assert = require('node:assert/strict');
const { markNoindex } = require('../scripts/mark-unreviewed-noindex');

test('unreviewed content receives an idempotent noindex directive', () => {
  const first = markNoindex('<html><head><title>Old claim</title></head><body></body></html>');
  assert.match(first, /noindex, nofollow, noarchive/);
  assert.equal(markNoindex(first), first);
});

test('existing robots metadata is replaced instead of duplicated', () => {
  const html = markNoindex('<head><meta name="robots" content="index, follow"></head>');
  assert.equal((html.match(/name="robots"/g) || []).length, 1);
  assert.match(html, /noindex, nofollow, noarchive/);
});
