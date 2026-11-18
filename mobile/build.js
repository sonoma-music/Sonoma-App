// Builds the mobile web bundle into mobile/www from the shared desktop UI (app/renderer).
// Usage: node mobile/build.js   (then: npx cap sync)
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const R = path.join(ROOT, 'app', 'renderer');
const OUT = path.join(__dirname, 'www');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });

for (const f of ['styles.css', 'renderer.js', 'get.js', 'lyrics.js']) fs.copyFileSync(path.join(R, f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(R, 'fonts'))) fs.copyFileSync(path.join(R, 'fonts', f), path.join(OUT, 'fonts', f));
fs.copyFileSync(path.join(__dirname, 'src', 'mobile.css'), path.join(OUT, 'mobile.css'));

// The shared app/services.js was written for Electron's main process. In the app it runs in the
// WebView, so Node modules are replaced with small shims and network calls go through native HTTP.
const shims = {
  name: 'sonoma-shims',
  setup(b) {
    const S = {
      electron: 'module.exports = { net: { fetch: (u, o) => window.__sonomaNet.fetch(u, o) } };',
      fs: 'module.exports = {};',
      child_process: 'module.exports = { execFile() {}, spawn() {} };',
      crypto: 'module.exports = { randomUUID: () => self.crypto.randomUUID(), createHash() { throw new Error("not available"); } };',
      'node-taglib-sharp': 'module.exports = {};',
      path: `module.exports = {
        basename: (p, e) => { const b = String(p).split(/[\\\\/]/).pop(); return e && b.endsWith(e) ? b.slice(0, -e.length) : b; },
        extname: p => { const m = String(p).match(/\\.[^.\\\\/]*$/); return m ? m[0] : ''; },
        join: (...a) => a.join('/').replace(/\\/+/g, '/'), dirname: p => String(p).replace(/[\\\\/][^\\\\/]*$/, '') };`
    };
    b.onResolve({ filter: new RegExp(`^(${Object.keys(S).join('|')})$`) }, a => ({ path: a.path, namespace: 'shim' }));
    b.onLoad({ filter: /.*/, namespace: 'shim' }, a => ({ contents: S[a.path], loader: 'js' }));
  }
};

esbuild.build({
  entryPoints: [path.join(__dirname, 'src', 'sonoma-mobile.js')],
  bundle: true, format: 'iife', platform: 'browser', target: ['es2020', 'safari15'],
  outfile: path.join(OUT, 'sonoma-mobile.js'), minify: true, legalComments: 'none',
  plugins: [shims], define: { 'process.platform': '"mobile"', 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
  logLevel: 'warning'
}).then(() => {
  let html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
  html = html
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,
      `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' capacitor: https://localhost; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https: wss: ws: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'">`)
    .replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="styles.css">\n<link rel="stylesheet" href="mobile.css">')
    .replace('<script src="lyrics.js"></script>', '<script src="sonoma-mobile.js"></script>\n<script src="lyrics.js"></script>');
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log('mobile/www ready');
}).catch(e => { console.error(e); process.exit(1); });
