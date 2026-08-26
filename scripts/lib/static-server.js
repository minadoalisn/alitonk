const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function resolveStaticPath(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(requestPath || '/').split('?', 1)[0]);
  } catch {
    return null;
  }
  const segments = decoded.replace(/\\/g, '/').split('/');
  if (segments.some(segment => segment === '..' || segment.includes('\0'))) return null;
  let relative = segments.filter(Boolean).join('/');
  if (!relative || decoded.endsWith('/')) relative = path.posix.join(relative, 'index.html');
  else if (!path.posix.extname(relative)) relative = `${relative}.html`;
  const absolute = path.resolve(root, ...relative.split('/'));
  const normalizedRoot = `${path.resolve(root)}${path.sep}`;
  if (absolute !== path.resolve(root) && !absolute.startsWith(normalizedRoot)) return null;
  return absolute;
}

function sendFile(response, filePath, method, status = 200) {
  response.writeHead(status, {
    'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  });
  if (method === 'HEAD') return response.end();
  fs.createReadStream(filePath).pipe(response);
}

function createStaticServer(root) {
  const publicRoot = path.resolve(root);
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Method Not Allowed');
    }
    const filePath = resolveStaticPath(publicRoot, request.url);
    if (!filePath) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Bad Request');
    }
    fs.stat(filePath, (error, stat) => {
      if (!error && stat.isFile()) return sendFile(response, filePath, request.method);
      const notFound = path.join(publicRoot, '404.html');
      fs.stat(notFound, notFoundError => {
        if (!notFoundError) return sendFile(response, notFound, request.method, 404);
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not Found');
      });
    });
  });
}

module.exports = { createStaticServer, resolveStaticPath };
