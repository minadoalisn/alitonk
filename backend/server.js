// Secure static file server for ALI Charity with security headers
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types WITHOUT charset (charset added separately)
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

// Security headers - Allow Tailwind CDN and external resources
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Download-Options': 'noopen',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google-analytics.com https://tagmanager.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://p.typekit.net https://*.typekit.net; font-src 'self' data: https: https://fonts.gstatic.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://p.typekit.net https://*.typekit.net https://use.typekit.net; img-src 'self' data: https: blob: https://images.unsplash.com https://*.unsplash.com https://*.picsum.photos; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://www.google-analytics.com https://analytics.google.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://api.coingecko.com https://api.binance.com https://43.160.238.228:3333 https://43.160.238.228 https://cdn.tailwindcss.com https://cdn.jsdelivr.net ws://localhost:* wss://localhost:*; frame-src 'self' https://www.googletagmanager.com https://googleads.g.doubleclick.net; media-src 'self' https: blob:;",
  'X-Permitted-Cross-Domain-Policies': "all",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Cache-Control': 'public, max-age=0, must-revalidate'
};

// Rate limiting (in-memory, resets on restart)
const RATE_LIMIT = 100;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000);
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return recentRequests.length <= RATE_LIMIT;
}

function logRequest(req, status, responseTime) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${status} - ${responseTime}ms`);
}

const server = http.createServer((req, res) => {
  const startTime = Date.now();
  
  if (!checkRateLimit(req.socket.remoteAddress || 'unknown')) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Retry-After', '60');
    res.writeHead(429);
    res.end('Too Many Requests');
    logRequest(req, 429, 0);
    return;
  }
  
  // Set all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  const ext = path.extname(filePath);
  const baseContentType = MIME_TYPES[ext] || 'application/octet-stream';
  // Add charset ONLY once here
  const contentType = baseContentType + '; charset=utf-8';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
          if (err) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.writeHead(404);
            res.end('<h1>404 - Page Not Found</h1><p><a href="/">Go Home</a></p>');
          } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.writeHead(200);
            res.end(content);
          }
        });
      } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(500);
        res.end('<h1>500 - Server Error</h1><p>Something went wrong.</p>');
      }
    } else {
      res.setHeader('Content-Type', contentType);
      res.writeHead(200);
      res.end(content);
    }
    
    logRequest(req, 200, Date.now() - startTime);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 ALI Charity Server running on port ${PORT}`);
  console.log(`📁 Serving from: ${PUBLIC_DIR}`);
  console.log(`🔒 Security Headers: ACTIVE (Tailwind CDN allowed)`);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  server.close();
});
