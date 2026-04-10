// Simple static file server for ALI Charity
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

const server = http.createServer((req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found');
          } else {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(content);
          }
        });
      } else {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('500 Server Error');
      }
    } else {
      res.writeHead(200, {'Content-Type': contentType});
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
