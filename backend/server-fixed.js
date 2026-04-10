// Secure static file server for ALI Charity with security headers
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

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

// Security headers (removed duplicate charset)
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Download-Options': 'noopen',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https:; font-src 'self' data: https: fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; frame-src 'self' https://www.googletagmanager.com; child-src 'self' blob: data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self' blob: data: https: https: www.googletagmanager.com;",
  'X-Permitted-Cross-Domain-Policies': "camera=(), microphone=(), fullscreen=(self), payment=(self), USB=()",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'public, max-age=0, must-revalidate'
};

// Rate limiting (in-memory, resets on restart)
const RATE_LIMIT = 100; // requests per minute
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  
  // Filter to only count requests in the last minute
  const recentRequests = userRequests.filter(time => now - time < 60000);
  recentRequests.push(now);
  
  rateLimitMap.set(ip, recentRequests);
  
  return recentRequests.length <= RATE_LIMIT;
}

// Request logging
function logRequest(req, status, responseTime) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${status} - ${responseTime}ms - ${req.ip || 'unknown'}`);
}

const server = http.createServer((req, res) => {
  const startTime = Date.now();
  
  // Apply rate limiting
  if (!checkRateLimit(req.socket.remoteAddress || 'unknown')) {
    res.writeHead(429, { 'Content-Type': 'text/plain', 
      'Retry-After': '60' });
    res.end('Too Many Requests');
    logRequest(req, 429, 0);
    return;
  }
  
  // Set all security headers (before Content-Type)
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Handle directory requests
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  const ext = path.extname(filePath);
  const baseContentType = MIME_TYPES[ext] || 'application/octet-stream';
  const contentType = `${baseContentType}; charset=utf-8`;
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try index.html for SPA routing
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - Page Not Found</h1><p><a href="/">Go Home</a></p>');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>500 - Server Error</h1><p>Something went wrong.</p>');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
    
    logRequest(req, 200, Date.now() - startTime);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 ALI Charity Secure Server running on port ${PORT}`);
  console.log(`📁 Serving from: ${PUBLIC_DIR}`);
  console.log(`🔒 Security Headers: ACTIVE`);
  console.log(`📊 Rate Limit: ${RATE_LIMIT} requests/minute`);
  console.log(`📊 Server Status: https://minadoai.com/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
  });
});
