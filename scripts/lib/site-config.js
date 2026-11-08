// Loads public/js/site-config.js (a browser script) into Node without a browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSiteConfig(file = path.join(__dirname, '..', '..', 'public', 'js', 'site-config.js')) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  if (!sandbox.window.ALI_SITE_CONFIG) throw new Error('ALI_SITE_CONFIG not defined');
  return sandbox.window.ALI_SITE_CONFIG;
}

function networkSlug(network) {
  return String(network).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

module.exports = { loadSiteConfig, networkSlug };
