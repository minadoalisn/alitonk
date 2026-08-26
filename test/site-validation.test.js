const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { validateSite } = require('../scripts/lib/site-validation');

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ali-site-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

test('reports broken links, duplicate canonicals, and forbidden public files', t => {
  const fixture = makeFixture({
    'index.html': '<link rel="canonical" href="https://example.com/"><a href="/missing.html">x</a>',
    'copy.html': '<link rel="canonical" href="https://example.com/">',
    'admin-login.html': '<title>Admin</title>'
  });
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const result = validateSite(fixture);
  assert.match(result.errors.join('\n'), /missing\.html/);
  assert.match(result.errors.join('\n'), /duplicate canonical/i);
  assert.match(result.errors.join('\n'), /admin-login\.html/);
});

test('accepts assets, directory indexes, fragments, and configured redirects', t => {
  const fixture = makeFixture({
    'index.html': '<a href="/about"><img src="/img/logo.svg"><a href="#proof">Proof</a>',
    'about/index.html': '<h1>About</h1>',
    'img/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg" />'
  });
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const result = validateSite(fixture, { '/old': '/about/' });
  assert.deepEqual(result.errors, []);
});

test('rejects references that escape the public directory', t => {
  const fixture = makeFixture({ 'index.html': '<a href="../../server.js">unsafe</a>' });
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const result = validateSite(fixture);
  assert.match(result.errors.join('\n'), /escapes public directory/i);
});
