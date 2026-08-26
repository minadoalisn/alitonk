const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_PUBLIC_FILE = /(?:^|\/)(?:admin(?:-login)?|dashboard|test(?:-[^/]*)?|[^/]*(?:backup|\.bak)[^/]*|[^/]*-[vV]\d[^/]*)\.(?:html?|txt)$/;

function walk(root, current = root, output = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, absolute, output);
    else output.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
  return output;
}

function withoutQuery(value) {
  return value.split('#', 1)[0].split('?', 1)[0];
}

function isExternal(value) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
}

function candidatesFor(reference, owner) {
  const cleaned = withoutQuery(reference.trim());
  if (!cleaned || cleaned.startsWith('#') || isExternal(cleaned)) return [];
  const ownerDir = path.posix.dirname(owner);
  const joined = cleaned.startsWith('/')
    ? path.posix.normalize(cleaned.slice(1))
    : path.posix.normalize(path.posix.join(ownerDir, cleaned));
  if (joined === '..' || joined.startsWith('../') || path.posix.isAbsolute(joined)) return null;
  if (joined === '.') return ['index.html'];
  const candidates = [joined];
  if (joined.endsWith('/')) candidates.push(`${joined}index.html`);
  else if (!path.posix.extname(joined)) candidates.push(`${joined}.html`, `${joined}/index.html`);
  return candidates;
}

function extractAttributes(html) {
  const values = [];
  const pattern = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of html.matchAll(pattern)) values.push(match[1] ?? match[2] ?? '');
  return values;
}

function extractCanonical(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel\s*=\s*(?:"[^"]*canonical[^"]*"|'[^']*canonical[^']*')/i.test(tag)) continue;
    const href = tag.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    if (href) return href[1] || href[2];
  }
  return null;
}

function redirectMatches(reference, redirects) {
  const source = `/${withoutQuery(reference).replace(/^\//, '').replace(/\/$/, '')}`;
  return Object.prototype.hasOwnProperty.call(redirects, source);
}

function validateSite(publicDir, redirects = {}) {
  const files = walk(publicDir).sort();
  const fileSet = new Set(files);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const errors = [];
  const warnings = [];
  const canonicals = new Map();

  for (const file of files) {
    if (FORBIDDEN_PUBLIC_FILE.test(file)) errors.push(`Forbidden public file: ${file}`);
  }

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
    const canonical = extractCanonical(html);
    if (canonical) {
      const owners = canonicals.get(canonical) || [];
      owners.push(file);
      canonicals.set(canonical, owners);
    }
    for (const reference of extractAttributes(html)) {
      if (!reference || reference.startsWith('#') || isExternal(reference)) continue;
      if (redirectMatches(reference, redirects)) continue;
      const candidates = candidatesFor(reference, file);
      if (candidates === null) {
        errors.push(`${file}: reference escapes public directory: ${reference}`);
      } else if (candidates.length && !candidates.some(candidate => fileSet.has(candidate))) {
        errors.push(`${file}: broken reference ${reference}`);
      }
    }
  }

  for (const [canonical, owners] of canonicals) {
    if (owners.length > 1) errors.push(`Duplicate canonical ${canonical}: ${owners.join(', ')}`);
  }
  return { errors, warnings, files };
}

module.exports = { validateSite, candidatesFor };
