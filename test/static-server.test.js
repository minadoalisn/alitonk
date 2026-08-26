const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { resolveStaticPath } = require('../scripts/lib/static-server');

const root = path.resolve(__dirname, '..', 'public');

test('resolves normal pages and rejects traversal or malformed escapes', () => {
  assert.equal(resolveStaticPath(root, '/donate.html'), path.join(root, 'donate.html'));
  assert.equal(resolveStaticPath(root, '/../server.js'), null);
  assert.equal(resolveStaticPath(root, '/%2e%2e/server.js'), null);
  assert.equal(resolveStaticPath(root, '/%E0%A4%A'), null);
});

test('maps directories and extensionless routes to static documents', () => {
  assert.equal(resolveStaticPath(root, '/'), path.join(root, 'index.html'));
  assert.equal(resolveStaticPath(root, '/blog/'), path.join(root, 'blog', 'index.html'));
  assert.equal(resolveStaticPath(root, '/about'), path.join(root, 'about.html'));
});
