const https = require('https');

const CHECKS = [
  {
    name: 'Main site home',
    url: 'https://minadoai.com/',
    mustContain: ['site-polish.css', 'site-config.js']
  },
  {
    name: 'Main site sitemap',
    url: 'https://minadoai.com/sitemap.xml',
    mustContain: ['https://minadoai.com/', 'donate.html']
  },
  {
    name: 'Main donate page',
    url: 'https://minadoai.com/donate.html',
    mustContain: [
      '0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC',
      '0x4de5F4ac5daC9667eD38A09B908B6Ee7D6E06E79'
    ]
  },
  {
    name: 'Blog home',
    url: 'https://alicharity.blog/',
    mustContain: ['ALI', 'Charity']
  },
  {
    name: 'Blog sitemap',
    url: 'https://alicharity.blog/sitemap.xml',
    mustContain: ['https://alicharity.blog/']
  }
];

const OPTIONAL_CHECKS = [
  {
    name: 'Latest generated promotion on blog domain',
    url: 'https://alicharity.blog/blog/news/2026-05-06-web3-philanthropy-donor-rewards.html',
    mustContain: ['Web3 Philanthropy', 'ALI Charity']
  }
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'ALI-Charity-Deployment-Health/1.0'
      },
      timeout: 15000
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

async function runCheck(check, optional = false) {
  const result = await fetchText(check.url);
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
