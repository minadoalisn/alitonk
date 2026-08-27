const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../config/geo-authority.json');
const { assessPage, crawlerAllowed, fileForPage, pageUrl } = require('./lib/geo-discovery');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, 'memory', 'research', 'geo-learning');
const stateFile = path.join(outDir, 'latest.json');
const runDate = process.env.GEO_RUN_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());

function previousState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return null; }
}

function main() {
  const robots = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8');
  const llms = fs.readFileSync(path.join(publicDir, 'llms.txt'), 'utf8');
  const pages = manifest.pages.map(page => {
    const file = fileForPage(publicDir, page.path);
    if (!fs.existsSync(file)) return { path: page.path, url: pageUrl(manifest.site.baseUrl, page.path), score: 0, missing: true, checks: {} };
    return { path: page.path, url: pageUrl(manifest.site.baseUrl, page.path), ...assessPage(fs.readFileSync(file, 'utf8'), pageUrl(manifest.site.baseUrl, page.path)) };
  });
  const crawlers = manifest.aiSearchCrawlers.map(agent => ({ agent, allowed: crawlerAllowed(robots, agent) }));
  const discovery = {
    allSearchCrawlersAllowed: crawlers.every(item => item.allowed),
    llmsHasMarkdownLinks: /\[[^\]]+\]\(https:\/\//.test(llms),
    feedExists: fs.existsSync(path.join(publicDir, 'feed.xml')),
    sitemapExists: fs.existsSync(path.join(publicDir, 'sitemap.xml'))
  };
  const pageAverage = Math.round(pages.reduce((sum, page) => sum + page.score, 0) / pages.length);
  const discoveryScore = Math.round(Object.values(discovery).filter(Boolean).length / Object.keys(discovery).length * 100);
  const score = Math.round(pageAverage * 0.75 + discoveryScore * 0.25);
  const previous = previousState();
  const weakestPage = [...pages].sort((a, b) => a.score - b.score || a.path.localeCompare(b.path))[0];
  const missingChecks = Object.entries(weakestPage.checks || {}).filter(([, pass]) => !pass).map(([name]) => name);
  const status = previous ? (score > previous.score ? 'improved' : score < previous.score ? 'regressed' : 'stable') : 'baseline';
  const report = {
    generatedAt: `${runDate}T00:00:00+08:00`,
    score,
    previousScore: previous && previous.score,
    status,
    pageAverage,
    discoveryScore,
    discovery,
    crawlers,
    weakestPage: { path: weakestPage.path, score: weakestPage.score, missingChecks },
    nextExperiment: missingChecks.length
      ? `Improve ${missingChecks[0]} on ${weakestPage.path}, then rerun npm run geo:learn.`
      : 'Review the oldest authoritative page for factual freshness; do not publish without source evidence.',
    pages,
    history: [...(previous && Array.isArray(previous.history) ? previous.history : []), { date: runDate, score }].slice(-12)
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'latest.md'), `# ALI Charity GEO Learning Loop\n\nGenerated: ${report.generatedAt}\n\n- Readiness score: **${score}/100** (${status})\n- Reviewed page average: **${pageAverage}/100**\n- Discovery controls: **${discoveryScore}/100**\n- Weakest reviewed page: **${weakestPage.path} (${weakestPage.score}/100)**\n- Next experiment: ${report.nextExperiment}\n\nThis is an observable site-readiness score, not a claim about rankings, citations, or traffic.\n`);
  console.log(`GEO learning loop: ${score}/100 (${status}). ${report.nextExperiment}`);
  if (!discovery.allSearchCrawlersAllowed || !discovery.feedExists || !discovery.sitemapExists) process.exitCode = 1;
}

main();
