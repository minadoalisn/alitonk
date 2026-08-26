const { execSync } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');

const BASE_URL = process.env.DEPLOY_BASE_URL || 'https://minadoai.com';
const CHECKS = [
  ['Homepage', '/', ['Help people.', '/css/home.css', '/js/public-records.js']],
  ['Donation flow', '/donate.html', ['Donate crypto in two steps.', '/js/donation-flow.js', '/js/donation-page.js']],
  ['Donor safety', '/donor-safety.html', ['Donor Safety', 'irreversible crypto transfers']],
  ['Transparency method', '/transparency.html', ['Our transparency method', 'What we do not infer']],
  ['About', '/about.html', ['ALI Charity']],
  ['Editorial library', '/blog/', ['Clear answers for safer crypto giving.', 'Practical, evidence-led guides']],
  ['Robots', '/robots.txt', ['Sitemap: https://minadoai.com/sitemap.xml']],
  ['Sitemap', '/sitemap.xml', ['https://minadoai.com/', 'donate.html', 'transparency.html']],
  ['LLM guidance', '/llms.txt', ['public-evidence-first', 'Interpretation rules']],
  ['Donation data', '/data/donations.json', ['"donations"']],
  ['Official address configuration', '/js/site-config.js', ['donations', 'USDT', 'BTC']]
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('http://') ? http : https;
    const request = client.get(url, { headers: { 'User-Agent': 'ALI-Charity-Deployment-Health/2.0' }, timeout: 20000 }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('timeout', () => request.destroy(new Error(`Timed out fetching ${url}`)));
    request.on('error', reject);
  });
}

function expectedCommit() {
  if (process.env.EXPECTED_DEPLOY_COMMIT) return process.env.EXPECTED_DEPLOY_COMMIT.trim();
  for (const ref of ['origin/main', 'HEAD']) {
    try { return execSync(`git rev-parse ${ref}`, { encoding: 'utf8' }).trim(); } catch {}
  }
  return null;
}

async function checkPage(name, pathname, markers) {
  const response = await fetchText(`${BASE_URL}${pathname}`);
  const missing = markers.filter(marker => !response.body.includes(marker));
  if (response.status < 200 || response.status >= 300 || missing.length) {
    throw new Error(`${name}: status=${response.status}, missing=${missing.join(', ') || 'none'}`);
  }
}

async function checkVersion() {
  const expected = expectedCommit();
  if (!expected) return;
  const response = await fetchText(`${BASE_URL}/deploy-version.json`);
  let payload;
  try { payload = JSON.parse(response.body); } catch { throw new Error('Deployment version is not valid JSON'); }
  if (response.status !== 200 || payload.commit !== expected) {
    throw new Error(`Deployment version: expected=${expected}, deployed=${payload.commit || 'unknown'}`);
  }
}

async function runOnce() {
  for (const [name, pathname, markers] of CHECKS) await checkPage(name, pathname, markers);
  await checkVersion();
}

async function main() {
  const attempts = Number(process.env.DEPLOY_CHECK_ATTEMPTS || 12);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runOnce();
      console.log(`Deployment health passed: ${CHECKS.length} routes and release version verified.`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`Deployment not ready (${attempt}/${attempts}): ${error.message}`);
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  throw lastError;
}

main().catch(error => {
  console.error(`Deployment health failed: ${error.message}`);
  process.exitCode = 1;
});
