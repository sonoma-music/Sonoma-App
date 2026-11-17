// Sonoma admin service: stores the token contract address (CA) and X account details that the
// website shows, behind a single admin token. No dependencies; Node 18+.
//
//   ADMIN_TOKEN=...  PORT=4610  DATA_DIR=/var/lib/sonoma-admin  node admin/server.js
//
// Public:  GET  /api/public            -> site config (CA, ticker, X account, images)
//          GET  /api/media/<file>      -> uploaded avatar / banner
// Admin:   GET  /admin                 -> admin panel
//          POST /api/admin/login       { token }      (sets a session cookie)
//          POST /api/admin/logout
//          GET  /api/admin/config
//          PUT  /api/admin/config      { ...fields }
//          POST /api/admin/upload?kind=avatar|banner   (raw image body, max 5 MB)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 4610;
const TOKEN = process.env.ADMIN_TOKEN || '';
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const MEDIA = path.join(DATA, 'media');
const CONFIG = path.join(DATA, 'config.json');
const UI = path.join(__dirname, 'public', 'index.html');
if (TOKEN.length < 24) { console.error('Set ADMIN_TOKEN (at least 24 characters).'); process.exit(1); }
fs.mkdirSync(MEDIA, { recursive: true });

const DEFAULTS = {
  ticker: 'SONOMA', chain: 'Robinhood Chain', ca: '', explorerUrl: '', buyUrl: '', chartUrl: '',
  launchState: 'soon', // soon | live
  x: { handle: '', name: 'Sonoma', bio: '' }, avatar: '', banner: '', updatedAt: null
};
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG, 'utf8')) }; } catch { return { ...DEFAULTS }; } };
const store = c => { const tmp = CONFIG + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(c, null, 2)); fs.renameSync(tmp, CONFIG); };

// ---------- sessions & login throttling ----------
const sessions = new Map(); // id -> expiry
const attempts = new Map(); // ip -> [timestamps]
const SESSION_MS = 12 * 3600 * 1000;
const SECURE = process.env.COOKIE_INSECURE === '1' ? '' : ' Secure;'; // only for local testing over http
const tokenOk = t => { const a = Buffer.from(String(t || '')), b = Buffer.from(TOKEN); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p.length === 2));
const authed = req => { const id = cookie(req).sa; const exp = id && sessions.get(id); if (!exp || exp < Date.now()) { if (id) sessions.delete(id); return false; } return true; };
const ip = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
function throttled(req) {
  const now = Date.now(), list = (attempts.get(ip(req)) || []).filter(t => now - t < 10 * 60 * 1000);
  attempts.set(ip(req), list);
  return list.length >= 8;
}

// ---------- validation ----------
const httpsUrl = v => { if (!v) return ''; const u = new URL(String(v)); if (u.protocol !== 'https:') throw new Error('Links must start with https://'); return u.toString(); };
const clip = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
function clean(body) {
  const c = load();
  if ('ticker' in body) { const t = clip(body.ticker, 12).replace(/^\$/, '').toUpperCase(); if (t && !/^[A-Z0-9]{1,12}$/.test(t)) throw new Error('Ticker: letters and digits only'); c.ticker = t; }
  if ('chain' in body) c.chain = clip(body.chain, 40) || 'Robinhood Chain';
  if ('ca' in body) { const ca = clip(body.ca, 80); if (ca && !/^0x[a-fA-F0-9]{40}$/.test(ca)) throw new Error('Contract address must look like 0x followed by 40 hex characters'); c.ca = ca; }
  for (const k of ['explorerUrl', 'buyUrl', 'chartUrl']) if (k in body) c[k] = httpsUrl(body[k]);
  if ('launchState' in body) c.launchState = body.launchState === 'live' ? 'live' : 'soon';
  if (body.x) {
    const h = clip(body.x.handle, 16).replace(/^@/, '');
    if (h && !/^[A-Za-z0-9_]{1,15}$/.test(h)) throw new Error('X handle: up to 15 letters, digits or _');
    c.x = { handle: h, name: clip(body.x.name, 50), bio: clip(body.x.bio, 160) };
  }
  c.updatedAt = new Date().toISOString();
  return c;
}
function sniff(buf) {
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

// ---------- http ----------
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Cache-Control': 'no-store' };
const json = (res, code, obj, extra = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...SEC, ...extra }); res.end(JSON.stringify(obj)); };
const readBody = (req, max) => new Promise((resolve, reject) => {
  const chunks = []; let n = 0;
  req.on('data', c => { n += c.length; if (n > max) { reject(new Error('Too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject);
});
const publicView = c => ({ ticker: c.ticker, chain: c.chain, ca: c.ca, explorerUrl: c.explorerUrl, buyUrl: c.buyUrl, chartUrl: c.chartUrl, launchState: c.launchState, x: c.x, avatar: c.avatar, banner: c.banner, updatedAt: c.updatedAt });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/api/public') return json(res, 200, publicView(load()), { 'Cache-Control': 'public, max-age=30', 'Access-Control-Allow-Origin': '*' });
    if (req.method === 'GET' && p.startsWith('/api/media/')) {
      const f = path.basename(p);
      const file = path.join(MEDIA, f);
      if (!/^[\w-]+\.(png|jpg|webp)$/.test(f) || !fs.existsSync(file)) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[f.split('.').pop()], 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
      return fs.createReadStream(file).pipe(res);
    }
    if (req.method === 'GET' && (p === '/admin' || p === '/admin/')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...SEC, 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'" });
      return res.end(fs.readFileSync(UI));
    }
    if (p.startsWith('/api/admin/')) {
      // simple CSRF guard: the panel always sends this header; cross-site forms can't
      if (req.method !== 'GET' && req.headers['x-sonoma-admin'] !== '1') return json(res, 403, { error: 'Forbidden' });
      if (p === '/api/admin/login' && req.method === 'POST') {
        if (throttled(req)) return json(res, 429, { error: 'Too many attempts. Wait 10 minutes.' });
        const body = JSON.parse((await readBody(req, 4096)).toString() || '{}');
        if (!tokenOk(body.token)) { attempts.get(ip(req)).push(Date.now()); return json(res, 401, { error: 'Wrong admin token' }); }
        const id = crypto.randomBytes(24).toString('hex');
        sessions.set(id, Date.now() + SESSION_MS);
        return json(res, 200, { ok: true }, { 'Set-Cookie': `sa=${id}; HttpOnly;${SECURE} SameSite=Strict; Path=/api/admin; Max-Age=${SESSION_MS / 1000}` });
      }
      if (p === '/api/admin/logout' && req.method === 'POST') { sessions.delete(cookie(req).sa); return json(res, 200, { ok: true }, { 'Set-Cookie': 'sa=; HttpOnly;' + SECURE + ' SameSite=Strict; Path=/api/admin; Max-Age=0' }); }
      if (!authed(req)) return json(res, 401, { error: 'Please log in' });
      if (p === '/api/admin/config' && req.method === 'GET') return json(res, 200, load());
      if (p === '/api/admin/config' && req.method === 'PUT') {
        const next = clean(JSON.parse((await readBody(req, 16384)).toString() || '{}'));
        store(next); return json(res, 200, next);
      }
      if (p === '/api/admin/upload' && req.method === 'POST') {
        const kind = url.searchParams.get('kind');
        if (!['avatar', 'banner'].includes(kind)) return json(res, 400, { error: 'kind must be avatar or banner' });
        const buf = await readBody(req, 5 * 1024 * 1024);
        const ext = sniff(buf);
        if (!ext) return json(res, 400, { error: 'Use a PNG, JPG or WebP image' });
        const name = `${kind}-${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(MEDIA, name), buf);
        const c = load();
        const old = c[kind]; c[kind] = `/api/media/${name}`; c.updatedAt = new Date().toISOString(); store(c);
        if (old) fs.rm(path.join(MEDIA, path.basename(old)), { force: true }, () => {});
        return json(res, 200, c);
      }
    }
    json(res, 404, { error: 'Not found' });
  } catch (e) {
    json(res, e.message === 'Too large' ? 413 : 400, { error: e.message || 'Bad request' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Sonoma admin on http://127.0.0.1:${PORT}/admin`));
