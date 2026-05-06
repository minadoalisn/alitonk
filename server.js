const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

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

const server = http.createServer((req, res) => {
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
  console.log(`ALI Charity static server running on port ${PORT}`);
});
