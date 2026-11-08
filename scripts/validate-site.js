const path = require('node:path');
const { validateSite } = require('./lib/site-validation');

const { config } = require('./write-vercel-config');

// Redirect sources come from the same config Vercel deploys, so links to
// retired URLs validate only while a redirect for them actually exists.
const redirects = Object.fromEntries(config.redirects
  .filter(rule => !rule.has && !rule.source.includes(':'))
  .map(rule => [rule.source.replace(/\/$/, '') || '/', rule.destination]));

const publicDir = path.join(__dirname, '..', 'public');
const result = validateSite(publicDir, redirects);

for (const warning of result.warnings) console.warn(`WARN ${warning}`);
for (const error of result.errors) console.error(`ERROR ${error}`);

if (result.errors.length) {
  console.error(`Site validation failed with ${result.errors.length} error(s) across ${result.files.length} files.`);
  process.exitCode = 1;
} else {
  console.log(`Site validation passed: ${result.files.length} files, 0 errors.`);
}
