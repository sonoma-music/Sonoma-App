// Dev-only: serves docs-site/ with clean URLs (like the production server) on http://localhost:5179
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'docs-site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const tries = [p, p + '.html', path.join(p, 'index.html')];
  for (const t of tries) {
    const f = path.join(root, t);
    if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); return res.end(fs.readFileSync(f)); }
  }
  res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(path.join(root, '404.html')));
}).listen(5179, () => console.log('docs on http://localhost:5179'));
