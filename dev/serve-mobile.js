// Dev-only: serves mobile/www on http://localhost:5180 to try the phone UI in a browser (run `node mobile/build.js` first).
// Add ?album, ?home, ?lyrics, ?get-link … to load the demo data from dev/mock.js instead of the real phone storage.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'mobile', 'www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  const [p, q] = decodeURIComponent(req.url).split('?');
  if (p === '/__mock.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8') + "\ndocument.documentElement.classList.add('mobile');"); }
  const f = path.join(root, p === '/' ? 'index.html' : p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  let body = fs.readFileSync(f);
  if (p === '/' && q) body = body.toString().replace('<script src="sonoma-mobile.js"></script>', '<script src="/__mock.js"></script>');
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(body);
}).listen(5180, () => console.log('mobile preview on http://localhost:5180'));
