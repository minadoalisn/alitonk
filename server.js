const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DONATIONS_FILE = path.join(PUBLIC_DIR, 'data', 'donations.json');
const COPY_STATS_FILE = path.join(PUBLIC_DIR, 'data', 'copy-stats.json');
const SITE_CONFIG_FILE = path.join(PUBLIC_DIR, 'js', 'site-config.js');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'admin-audit-log.json');
const TRAFFIC_FILE = path.join(DATA_DIR, 'traffic-stats.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const TRAFFIC_FLUSH_MS = 1000 * 15;
const sessions = new Map();
let trafficState = null;
let trafficDirty = false;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf'
};

const PROJECTS = [
  ['proj_general', 'War Zone Aid', 'General emergency relief'],
  ['proj_1', 'Earthquake Relief', 'Disaster response'],
  ['proj_2', 'Children Education', 'Education access'],
  ['proj_3', 'Medical Infrastructure', 'Clinics and care capacity'],
  ['proj_4', 'Disaster Emergency', 'Rapid response'],
  ['proj_5', 'Orphan Support', 'Child protection'],
  ['proj_6', 'Hospice Care', 'End-of-life care'],
  ['proj_7', 'Clean Water', 'Water access'],
  ['proj_8', 'Stray Animal Support', 'Animal welfare'],
  ['proj_9', 'Public Healthcare', 'Community healthcare'],
  ['proj_10', 'Disaster Prevention', 'Risk reduction'],
  ['proj_11', 'Sanitation Hygiene', 'Public sanitation']
].map(([id, name, allocation]) => ({ id, name, allocation, status: 'active' }));

const ROLE_PERMISSIONS = {
  owner: ['read', 'review', 'manage'],
  reviewer: ['read', 'review'],
  viewer: ['read']
};

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify({ events: [] }, null, 2));
  }
  if (!fs.existsSync(TRAFFIC_FILE)) {
    fs.writeFileSync(TRAFFIC_FILE, JSON.stringify(createEmptyTrafficState(), null, 2));
  }
}

function createEmptyTrafficState() {
  return {
    totalPageViews: 0,
    uniqueIpHashes: {},
    perDay: {},
    perPath: {},
    recent: [],
    online: {},
    lastUpdated: null
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(`ali:${ip || 'unknown'}`).digest('hex').slice(0, 16);
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function loadTrafficState() {
  if (!trafficState) {
    trafficState = readJson(TRAFFIC_FILE, createEmptyTrafficState());
    trafficState.uniqueIpHashes = trafficState.uniqueIpHashes || {};
    trafficState.perDay = trafficState.perDay || {};
    trafficState.perPath = trafficState.perPath || {};
    trafficState.recent = Array.isArray(trafficState.recent) ? trafficState.recent : [];
    trafficState.online = trafficState.online || {};
  }
  return trafficState;
}

function shouldTrackRequest(req, pathname) {
  if (req.method !== 'GET') return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/assets/') || pathname.startsWith('/js/') || pathname.startsWith('/css/')) return false;
  return pathname === '/' || pathname.endsWith('.html') || !path.extname(pathname);
}

function recordTraffic(req, pathname) {
  if (!shouldTrackRequest(req, pathname)) return;
  const state = loadTrafficState();
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ipHash = hashIp(getClientIp(req));
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 180);
  const cleanPath = pathname || '/';

  state.totalPageViews += 1;
  state.uniqueIpHashes[ipHash] = now.toISOString();
  state.perDay[day] = state.perDay[day] || { pageViews: 0, uniqueIpHashes: {} };
  state.perDay[day].pageViews += 1;
  state.perDay[day].uniqueIpHashes[ipHash] = true;
  state.perPath[cleanPath] = (state.perPath[cleanPath] || 0) + 1;
  state.online[ipHash] = { path: cleanPath, lastSeen: now.toISOString(), userAgent };
  state.recent.unshift({ timestamp: now.toISOString(), ipHash, path: cleanPath, userAgent });
  state.recent = state.recent.slice(0, 80);
  state.lastUpdated = now.toISOString();
  trafficDirty = true;
}

function flushTraffic() {
  if (!trafficDirty || !trafficState) return;
  const cutoff = Date.now() - 1000 * 60 * 15;
  for (const [ipHash, item] of Object.entries(trafficState.online || {})) {
    if (new Date(item.lastSeen).getTime() < cutoff) delete trafficState.online[ipHash];
  }
  writeJsonAtomic(TRAFFIC_FILE, trafficState);
  trafficDirty = false;
}

function getTrafficSummary() {
  const state = loadTrafficState();
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = state.perDay[today] || { pageViews: 0, uniqueIpHashes: {} };
  const onlineCutoff = Date.now() - 1000 * 60 * 5;
  const onlineVisitors = Object.values(state.online || {}).filter(item => new Date(item.lastSeen).getTime() >= onlineCutoff);
  return {
    totalPageViews: state.totalPageViews || 0,
    totalUniqueVisitors: Object.keys(state.uniqueIpHashes || {}).length,
    todayPageViews: todayStats.pageViews || 0,
    todayUniqueVisitors: Object.keys(todayStats.uniqueIpHashes || {}).length,
    onlineVisitors: onlineVisitors.length,
    topPaths: Object.entries(state.perPath || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([pathName, views]) => ({ path: pathName, views })),
    recent: (state.recent || []).slice(0, 20),
    lastUpdated: state.lastUpdated
  };
}

function getAdminUsers() {
  if (process.env.ADMIN_USERS_JSON) {
    try {
      const users = JSON.parse(process.env.ADMIN_USERS_JSON);
      if (Array.isArray(users)) return users;
    } catch (error) {
      console.warn('ADMIN_USERS_JSON is not valid JSON.');
    }
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || '';
  const role = process.env.ADMIN_ROLE || 'owner';
  return [{ username, password, role }];
}

function isDemoLoginAllowed() {
  return process.env.ADMIN_ALLOW_DEMO_LOGIN === 'true' || process.env.NODE_ENV !== 'production';
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getUserPermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

function hasPermission(user, permission) {
  return Boolean(user && getUserPermissions(user.role).includes(permission));
}

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const index = item.indexOf('=');
      if (index > -1) cookies[item.slice(0, index)] = decodeURIComponent(item.slice(index + 1));
      return cookies;
    }, {});
}

function getSession(req) {
  const token = parseCookies(req).ali_admin_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { token, ...session };
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    user: {
      username: user.username,
      role: user.role || 'viewer',
      permissions: getUserPermissions(user.role || 'viewer')
    },
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  sessions.set(token, session);
  return { token, session };
}

function getCookieOptions(maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `ali_admin_session=; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { ok: false, error: message });
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function verifySameOrigin(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return true;
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch (error) {
    return false;
  }
}

function requireAdmin(req, res, permission = 'read') {
  const session = getSession(req);
  if (!session) {
    sendError(res, 401, 'Authentication required');
    return null;
  }
  if (!hasPermission(session.user, permission)) {
    sendError(res, 403, 'Insufficient permissions');
    return null;
  }
  return session;
}

function loadSiteConfig() {
  const source = fs.readFileSync(SITE_CONFIG_FILE, 'utf8');
  const match = source.match(/Object\.freeze\(([\s\S]*?)\);?\s*$/);
  if (!match) return {};
  return Function(`"use strict"; return (${match[1]});`)();
}

function saveSiteConfig(config) {
  const source = `window.ALI_SITE_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
  fs.writeFileSync(SITE_CONFIG_FILE, source);
}

function isSafeAddressValue(value) {
  return typeof value === 'string' && value.length >= 16 && value.length <= 120 && /^[a-zA-Z0-9:_-]+$/.test(value);
}

function calculateDonationStats(donations) {
  const confirmed = donations.filter(item => item.status === 'confirmed');
  const pending = donations.filter(item => item.status === 'pending_review' || item.status === 'pending');
  const totalAmount = confirmed.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingAmount = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    totalDonations: donations.length,
    confirmedDonations: confirmed.length,
    pendingDonations: pending.length,
    rejectedDonations: donations.filter(item => item.status === 'rejected').length,
    totalAmount: Number(totalAmount.toFixed(6)),
    pendingAmount: Number(pendingAmount.toFixed(6)),
    aliTokensIssued: Number(totalAmount.toFixed(6))
  };
}

function loadDonations() {
  const data = readJson(DONATIONS_FILE, { donations: [], stats: {} });
  const donations = Array.isArray(data.donations) ? data.donations : [];
  return {
    donations,
    stats: { ...data.stats, ...calculateDonationStats(donations) }
  };
}

function saveDonations(donations) {
  writeJsonAtomic(DONATIONS_FILE, {
    donations,
    stats: calculateDonationStats(donations)
  });
}

function nextDonationId(donations) {
  const numericIds = donations.map(item => Number(item.id)).filter(Number.isFinite);
  return numericIds.length ? Math.max(...numericIds) + 1 : 1;
}

function appendAuditEvent(event) {
  const audit = readJson(AUDIT_LOG_FILE, { events: [] });
  audit.events = Array.isArray(audit.events) ? audit.events : [];
  audit.events.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event
  });
  audit.events = audit.events.slice(0, 500);
  writeJsonAtomic(AUDIT_LOG_FILE, audit);
}

function resolvePublicPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const cleanPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const requestedPath = path.normalize(path.join(PUBLIC_DIR, cleanPath));

  if (!requestedPath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isDirectory()) {
    return path.join(requestedPath, 'index.html');
  }

  if (!path.extname(requestedPath)) {
    const htmlPath = `${requestedPath}.html`;
    if (fs.existsSync(htmlPath)) {
      return htmlPath;
    }
  }

  return requestedPath;
}

function sendFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = ext === '.html'
    ? 'public, max-age=0, must-revalidate'
    : 'public, max-age=31536000, immutable';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8'
      });
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }

    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(content);
  });
}

async function handleAdminApi(req, res, pathname) {
  if (!verifySameOrigin(req)) {
    sendError(res, 403, 'Cross-origin admin request blocked');
    return true;
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const users = getAdminUsers();
      const matched = users.find(user => user.username === body.username);
      const passwordMatches = matched && matched.password
        ? timingSafeEqualText(matched.password, body.password)
        : matched?.username === 'admin' && body.password === 'admin123' && isDemoLoginAllowed();
      if (!matched || !passwordMatches) {
        appendAuditEvent({ action: 'login_failed', username: body.username || 'unknown' });
        sendError(res, 401, 'Invalid username or password');
        return true;
      }
      const { token, session } = createSession(matched);
      appendAuditEvent({ action: 'login_success', username: matched.username, role: session.user.role });
      sendJson(res, 200, { ok: true, user: session.user }, {
        'Set-Cookie': `ali_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return true;
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const session = getSession(req);
    if (session) {
      sessions.delete(session.token);
      appendAuditEvent({ action: 'logout', username: session.user.username });
    }
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': getCookieOptions(0) });
    return true;
  }

  if (pathname === '/api/admin/me' && req.method === 'GET') {
    const session = requireAdmin(req, res, 'read');
    if (!session) return true;
    sendJson(res, 200, { ok: true, user: session.user });
    return true;
  }

  if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
    const session = requireAdmin(req, res, 'read');
    if (!session) return true;
    const donationData = loadDonations();
    const audit = readJson(AUDIT_LOG_FILE, { events: [] });
    sendJson(res, 200, {
      ok: true,
      user: session.user,
      donations: donationData.donations,
      stats: donationData.stats,
      copyStats: readJson(COPY_STATS_FILE, {}),
      siteConfig: loadSiteConfig(),
      projects: PROJECTS,
      traffic: getTrafficSummary(),
      permissions: ROLE_PERMISSIONS,
      auditEvents: (audit.events || []).slice(0, 25),
      generatedAt: new Date().toISOString()
    });
    return true;
  }

  if (pathname === '/api/admin/donations' && req.method === 'POST') {
    const session = requireAdmin(req, res, 'review');
    if (!session) return true;
    try {
      const body = await readBody(req);
      const currency = String(body.currency || 'USDT').toUpperCase();
      const amount = Number(body.amount || 0);
      const txHash = String(body.txHash || '').trim();
      if (!['USDT', 'ETH', 'BNB', 'BTC', 'SOL', 'ALI'].includes(currency)) {
        sendError(res, 400, 'Unsupported currency');
        return true;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        sendError(res, 400, 'Amount must be greater than zero');
        return true;
      }
      if (txHash.length < 8 || txHash.length > 140) {
        sendError(res, 400, 'Transaction hash or reference is required');
        return true;
      }
      const data = loadDonations();
      if (data.donations.some(item => item.txHash === txHash)) {
        sendError(res, 409, 'Donation reference already exists');
        return true;
      }
      const donation = {
        id: nextDonationId(data.donations),
        txHash,
        currency,
        amount: String(amount),
        timestamp: body.timestamp || new Date().toISOString(),
        status: 'pending_review',
        projectId: body.projectId || 'proj_general',
        submittedBy: session.user.username,
        note: String(body.note || '').slice(0, 500)
      };
      data.donations.unshift(donation);
      saveDonations(data.donations);
      appendAuditEvent({ action: 'donation_created', username: session.user.username, donationId: donation.id, nextStatus: donation.status, note: donation.note });
      sendJson(res, 201, { ok: true, donation, stats: calculateDonationStats(data.donations) });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return true;
  }

  const reviewMatch = pathname.match(/^\/api\/admin\/donations\/([^/]+)\/review$/);
  if (reviewMatch && req.method === 'POST') {
    const session = requireAdmin(req, res, 'review');
    if (!session) return true;
    try {
      const body = await readBody(req);
      const nextStatusByReview = {
        approve: 'confirmed',
        reject: 'rejected',
        pending: 'pending_review'
      };
      const reviewStatus = String(body.reviewStatus || '').toLowerCase();
      const nextStatus = nextStatusByReview[reviewStatus];
      if (!nextStatus) {
        sendError(res, 400, 'reviewStatus must be approve, reject, or pending');
        return true;
      }

      const donationId = decodeURIComponent(reviewMatch[1]);
      const data = loadDonations();
      const index = data.donations.findIndex(item => String(item.id) === donationId || item.txHash === donationId);
      if (index === -1) {
        sendError(res, 404, 'Donation record not found');
        return true;
      }

      const previous = data.donations[index];
      const updated = {
        ...previous,
        status: nextStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.user.username
      };
      data.donations[index] = updated;
      saveDonations(data.donations);
      appendAuditEvent({
        action: 'donation_review',
        username: session.user.username,
        donationId,
        previousStatus: previous.status || 'unknown',
        nextStatus,
        note: String(body.note || '').slice(0, 500)
      });
      sendJson(res, 200, { ok: true, donation: updated, stats: calculateDonationStats(data.donations) });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return true;
  }

  if (pathname === '/api/admin/site-config/address' && req.method === 'POST') {
    const session = requireAdmin(req, res, 'manage');
    if (!session) return true;
    try {
      const body = await readBody(req);
      const config = loadSiteConfig();
      const targetType = String(body.targetType || 'donation');
      const asset = String(body.asset || '').toUpperCase();
      const address = String(body.address || '').trim();
      const network = String(body.network || '').trim();

      if (!isSafeAddressValue(address)) {
        sendError(res, 400, 'Address contains unsupported characters or length');
        return true;
      }

      let previous;
      if (targetType === 'token') {
        previous = config.token?.contractAddress;
        config.token = { ...(config.token || {}), contractAddress: address };
        if (network) config.token.network = network;
      } else {
        if (!config.donations || !config.donations[asset]) {
          sendError(res, 404, 'Donation asset not found');
          return true;
        }
        previous = config.donations[asset].address;
        config.donations[asset] = {
          ...config.donations[asset],
          address,
          network: network || config.donations[asset].network
        };
      }

      saveSiteConfig(config);
      appendAuditEvent({
        action: 'address_update',
        username: session.user.username,
        asset: targetType === 'token' ? 'ALI_TOKEN' : asset,
        previousStatus: previous,
        nextStatus: address,
        note: String(body.note || '').slice(0, 500)
      });
      sendJson(res, 200, { ok: true, siteConfig: config });
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return true;
  }

  if (pathname.startsWith('/api/admin/')) {
    sendError(res, 404, 'Admin API route not found');
    return true;
  }

  return false;
}

ensureDataFiles();
loadTrafficState();
setInterval(flushTraffic, TRAFFIC_FLUSH_MS).unref();
process.on('exit', flushTraffic);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  recordTraffic(req, url.pathname);

  try {
    if (await handleAdminApi(req, res, url.pathname)) {
      return;
    }
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error');
    return;
  }

  const filePath = resolvePublicPath(req.url || '/');

  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath)) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, path.join(PUBLIC_DIR, '404.html'), 404);
});

server.listen(PORT, () => {
  console.log(`ALI Charity server running on port ${PORT}`);
});
