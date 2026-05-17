const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TRAFFIC_FILE = path.join(ROOT, 'data', 'traffic-stats.json');
const AUTOMATION_FILE = path.join(
  process.env.CODEX_HOME || path.join(process.env.USERPROFILE || '', '.codex'),
  'automations',
  'ali-charity-daily-seo-geo-growth',
  'automation.toml'
);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function uniqueCount(dayStats) {
  return Object.keys((dayStats && dayStats.uniqueIpHashes) || {}).length;
}

function formatList(items) {
  if (!items.length) return '- none';
  return items.map((item) => `- ${item}`).join('\n');
}

function humanAgent(userAgent) {
  if (!userAgent) return 'unknown';
  if (/Codex local server discovery|WindowsPowerShell|Invoke-WebRequest/i.test(userAgent)) return 'local check';
  if (/bot|crawler|spider/i.test(userAgent)) return 'bot/crawler';
  return 'browser';
}

function buildReport() {
  const state = readJson(TRAFFIC_FILE, {
    totalPageViews: 0,
    uniqueIpHashes: {},
    perDay: {},
    perPath: {},
    recent: [],
    online: {},
    lastUpdated: null
  });

  const today = toDateKey();
  const yesterday = toDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const todayStats = state.perDay?.[today] || { pageViews: 0, uniqueIpHashes: {} };
  const yesterdayStats = state.perDay?.[yesterday] || { pageViews: 0, uniqueIpHashes: {} };
  const onlineCutoff = Date.now() - 5 * 60 * 1000;
  const onlineVisitors = Object.values(state.online || {}).filter((item) => {
    return new Date(item.lastSeen).getTime() >= onlineCutoff;
  });

  const topPaths = Object.entries(state.perPath || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([pathName, views]) => `${pathName}: ${views}`);

  const recent = (state.recent || []).slice(0, 8).map((item) => {
    return `${item.timestamp} ${item.path} (${humanAgent(item.userAgent)})`;
  });

  const recentLocalChecks = (state.recent || []).slice(0, 40).filter((item) => {
    return humanAgent(item.userAgent) === 'local check';
  }).length;

  const automationActive = fs.existsSync(AUTOMATION_FILE)
    ? /status\s*=\s*"ACTIVE"/.test(fs.readFileSync(AUTOMATION_FILE, 'utf8'))
    : false;

  const weakTraffic = todayStats.pageViews < 20 || uniqueCount(todayStats) < 5;
  const recommendations = [];
  if (weakTraffic) {
    recommendations.push('Publish or refresh one answer-ready guide targeting a concrete query such as "how to donate crypto safely" or "transparent BNB Chain charity donation".');
    recommendations.push('Add internal CTA links from the highest-traffic pages to Donate, Transparency, Token, and Blog pages.');
  }
  if (recentLocalChecks > 10) {
    recommendations.push('Treat current numbers as directional only because recent traffic includes local health-check activity.');
  }
  if (!automationActive) {
    recommendations.push('Reactivate hourly growth automation before relying on unattended promotion.');
  }
  if (!recommendations.length) {
    recommendations.push('Keep the current hourly growth loop and compare today vs yesterday conversion-page traffic.');
  }

  return [
    '# ALI Charity Traffic Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Last traffic update: ${state.lastUpdated || 'none'}`,
    '',
    '## Summary',
    `- Total page views: ${state.totalPageViews || 0}`,
    `- Total unique visitor hashes: ${Object.keys(state.uniqueIpHashes || {}).length}`,
    `- Today page views: ${todayStats.pageViews || 0}`,
    `- Today unique visitor hashes: ${uniqueCount(todayStats)}`,
    `- Yesterday page views: ${yesterdayStats.pageViews || 0}`,
    `- Yesterday unique visitor hashes: ${uniqueCount(yesterdayStats)}`,
    `- Online visitors in last 5 minutes: ${onlineVisitors.length}`,
    `- Hourly growth automation active: ${automationActive ? 'yes' : 'no'}`,
    '',
    '## Top Paths',
    formatList(topPaths),
    '',
    '## Recent Requests',
    formatList(recent),
    '',
    '## Caveats',
    `- Recent local checks in latest 40 requests: ${recentLocalChecks}`,
    '- Visitor counts use hashed IPs from the local server log, not GA4/Search Console.',
    '',
    '## Recommended Next Actions',
    formatList(recommendations)
  ].join('\n');
}

console.log(buildReport());
