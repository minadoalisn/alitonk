const { execSync } = require('child_process');
const https = require('https');
const net = require('net');

const CHECKS = [
  {
    name: 'Main site home',
    url: 'https://minadoai.com/',
    mustContain: ['site-polish.css', 'site-config.js']
  },
  {
    name: 'Main site sitemap',
    url: 'https://minadoai.com/sitemap.xml',
    mustContain: [
      'https://minadoai.com/',
      'donate.html',
      'crypto-donation-safety-checklist-2026.html'
    ]
  },
  {
    name: 'Main donate page',
    url: 'https://minadoai.com/donate.html',
    mustContain: [
      '0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC',
      '0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79',
      'Open Safety Checklist'
    ]
  },
  {
    name: 'Main-site blog home',
    url: 'https://minadoai.com/blog/',
    mustContain: ['ALI', 'Charity', 'Crypto Donation Safety Checklist']
  },
  {
    name: 'Main-site blog sitemap',
    url: 'https://minadoai.com/blog/sitemap.xml',
    mustContain: [
      'https://minadoai.com/blog/',
      'crypto-donation-safety-checklist-2026.html'
    ]
  },
  {
    name: 'Crypto donation safety guide',
    url: 'https://minadoai.com/blog/crypto-donation-safety-checklist-2026.html',
    mustContain: [
      'Crypto Donation Safety Checklist (2026)',
      'FAQPage',
      'FTC: What To Know About Cryptocurrency and Scams'
    ]
  }
];

const OPTIONAL_CHECKS = [
  {
    name: 'Legacy standalone blog domain',
    url: 'https://alicharity.blog/',
    mustContain: ['ALI', 'Charity']
  }
];

const TCP_CHECKS = [
  {
    name: 'ALI server SSH',
    host: '43.160.238.228',
    port: 22
  }
];

const OPTIONAL_TCP_CHECKS = [
  {
    name: 'ALI server API candidate',
    host: '43.160.238.228',
    port: 3333
  }
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'ALI-Charity-Deployment-Health/1.0'
      },
      timeout: 30000
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error(`Timed out fetching ${url}`));
    });
    request.on('error', reject);
  });
}

function currentCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

async function fetchTextWithRetry(url, attempts = 2) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchText(url);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  throw lastError;
}

function checkTcp({ host, port }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeoutMs = 10000;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${host}:${port}`));
    });
    socket.once('error', reject);
    socket.connect(port, host);
  });
}

async function runCheck(check, optional = false) {
  const result = await fetchTextWithRetry(check.url);
  const statusOk = result.statusCode >= 200 && result.statusCode < 300;
  const missing = (check.mustContain || []).filter((text) => !result.body.includes(text));
  const ok = statusOk && missing.length === 0;
  const prefix = optional ? 'OPTIONAL' : 'CHECK';

  console.log(`${ok ? 'PASS' : optional ? 'WARN' : 'FAIL'} ${prefix}: ${check.name}`);
  console.log(`  URL: ${check.url}`);
  console.log(`  Status: ${result.statusCode}`);
  console.log(`  Cache: ${result.headers['cache-status'] || result.headers['cf-cache-status'] || 'n/a'}`);

  if (missing.length) {
    console.log(`  Missing content: ${missing.join(', ')}`);
  }

  if (!ok && !optional) {
    throw new Error(`${check.name} failed`);
  }
}

async function runLatestBlogCheck() {
  const index = await fetchTextWithRetry('https://minadoai.com/blog/news.html');
  const match = index.body.match(/href="(\/blog\/news\/[^"]+\.html)"/);

  if (!match) {
    console.log('WARN OPTIONAL: Latest generated promotion on main site');
    console.log('  No latest news link found on blog news index');
    return;
  }

  await runCheck({
    name: 'Latest generated promotion on main site',
    url: `https://minadoai.com${match[1]}`,
    mustContain: ['ALI Charity', 'FAQPage']
  }, true);
}

async function runDeployVersionCheck() {
  const expectedCommit = currentCommit();

  if (!expectedCommit) {
    console.log('WARN CHECK: Deployment version');
    console.log('  Could not resolve local Git commit.');
    return;
  }

  const result = await fetchTextWithRetry('https://minadoai.com/deploy-version.json');
  const statusOk = result.statusCode >= 200 && result.statusCode < 300;
  let deployed = null;

  try {
    deployed = JSON.parse(result.body);
  } catch (error) {
    console.log('FAIL CHECK: Deployment version');
    console.log('  URL: https://minadoai.com/deploy-version.json');
    console.log(`  Status: ${result.statusCode}`);
    console.log('  Missing valid deploy-version.json payload');
    throw new Error('Deployment version failed');
  }

  const deployedCommit = deployed && deployed.commit;
  const ok = statusOk && deployedCommit === expectedCommit;

  console.log(`${ok ? 'PASS' : 'FAIL'} CHECK: Deployment version`);
  console.log('  URL: https://minadoai.com/deploy-version.json');
  console.log(`  Status: ${result.statusCode}`);
  console.log(`  Expected commit: ${expectedCommit}`);
  console.log(`  Deployed commit: ${deployedCommit || 'unknown'}`);

  if (!ok) {
    throw new Error('Deployment version failed');
  }
}

async function runTcpCheck(check, optional = false) {
  const prefix = optional ? 'OPTIONAL TCP' : 'TCP';

  try {
    await checkTcp(check);
    console.log(`PASS ${prefix}: ${check.name}`);
    console.log(`  Target: ${check.host}:${check.port}`);
  } catch (error) {
    console.log(`${optional ? 'WARN' : 'FAIL'} ${prefix}: ${check.name}`);
    console.log(`  Target: ${check.host}:${check.port}`);
    console.log(`  ${error.message}`);

    if (!optional) {
      throw error;
    }
  }
}

async function main() {
  const failures = [];

  for (const check of CHECKS) {
    try {
      await runCheck(check);
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const check of OPTIONAL_CHECKS) {
    try {
      await runCheck(check, true);
    } catch (error) {
      console.log(`WARN OPTIONAL: ${check.name}`);
      console.log(`  ${error.message}`);
    }
  }

  try {
    await runLatestBlogCheck();
  } catch (error) {
    console.log('WARN OPTIONAL: Latest generated promotion on main site');
    console.log(`  ${error.message}`);
  }

  try {
    await runDeployVersionCheck();
  } catch (error) {
    failures.push(error.message);
  }

  for (const check of TCP_CHECKS) {
    try {
      await runTcpCheck(check);
    } catch (error) {
      failures.push(`${check.name} failed`);
    }
  }

  for (const check of OPTIONAL_TCP_CHECKS) {
    await runTcpCheck(check, true);
  }

  if (failures.length) {
    console.error('\nDeployment health check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('\nDeployment health check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
