// Dev-only: serves the renderer in a normal browser with a mocked window.sonoma (see mock.js).
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/admin')) { // forward to a local admin service (admin/server.js) if it runs
    const fwd = http.request({ host: '127.0.0.1', port: 4610, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    fwd.on('error', () => { res.writeHead(502); res.end('admin service not running'); });
    return req.pipe(fwd);
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') {
    const html = fs.readFileSync(path.join(root, 'app/renderer/index.html'), 'utf8')
      .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '<base href="/app/renderer/">')
      .replace('<script src="lyrics.js">', '<script src="/dev/mock.js"></script><script src="lyrics.js">');
    res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html);
  }
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(5178, () => console.log('preview on http://localhost:5178'));
