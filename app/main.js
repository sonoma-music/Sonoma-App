const { app, BrowserWindow, ipcMain, dialog, protocol, net, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const svc = require('./services');

const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.opus', '.aac', '.webm']);
const STORE_FILE = () => path.join(app.getPath('userData'), 'sonoma.json');
let win;
let pendingLink = process.argv.find(a => a.startsWith('sonoma://')) || null;

protocol.registerSchemesAsPrivileged([
  { scheme: 'sonoma-media', privileges: { stream: true, supportFetchAPI: true, bypassCSP: true } }
]);

// ---------- smart-link protocol / single instance ----------
if (process.defaultApp) {
  app.setAsDefaultProtocolClient('sonoma', process.execPath, [path.resolve(process.argv[1] || '.')]);
} else {
  app.setAsDefaultProtocolClient('sonoma');
}
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', (_e, argv) => {
  const link = argv.find(a => a.startsWith('sonoma://'));
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); if (link) win.webContents.send('open-link', link); }
});
app.on('open-url', (e, url) => { e.preventDefault(); if (win) win.webContents.send('open-link', url); else pendingLink = url; });

// ---------- store ----------
function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE(), 'utf8')); } catch { return {}; }
}
function writeStore(data) {
  fs.mkdirSync(path.dirname(STORE_FILE()), { recursive: true });
  fs.writeFileSync(STORE_FILE(), JSON.stringify(data, null, 2));
}

// ---------- library scanning ----------
function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (AUDIO_EXT.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

let mm;
async function readTags(file) {
  const base = path.basename(file, path.extname(file));
  const [fa, ft] = base.includes(' - ') ? base.split(' - ', 2) : ['', base];
  const track = { id: file, path: file, title: ft.trim(), artist: fa.trim() || 'Unknown artist', album: '', albumArtist: '', year: null, trackNo: null, duration: 0, cover: null };
  try {
    mm ??= await import('music-metadata');
    const meta = await mm.parseFile(file, { duration: true });
    const c = meta.common;
    if (c.title) track.title = c.title;
    if (c.artist) track.artist = c.artist;
    if (c.album) track.album = c.album;
    if (c.albumartist) track.albumArtist = c.albumartist;
    if (c.year) track.year = c.year;
    if (c.track?.no) track.trackNo = c.track.no;
    track.duration = meta.format.duration || 0;
    const pic = c.picture?.[0];
    if (pic && pic.data.length < 400_000) track.cover = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
  } catch { /* fall back to filename */ }
  return track;
}

// ---------- window ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    backgroundColor: '#0b2440', title: 'Sonoma',
    frame: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => { if (pendingLink) { win.webContents.send('open-link', pendingLink); pendingLink = null; } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  protocol.handle('sonoma-media', req => {
    const file = decodeURIComponent(new URL(req.url).searchParams.get('p') || '');
    return net.fetch(pathToFileURL(file).toString(), { headers: req.headers });
  });

  ipcMain.handle('store:get', () => readStore());
  ipcMain.handle('store:set', (_e, data) => { writeStore(data); return true; });

  ipcMain.handle('library:pick', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'multiSelections'] });
    if (r.canceled) return [];
    const files = r.filePaths.flatMap(d => walk(d));
    const tracks = [];
    for (let i = 0; i < files.length; i++) {
      tracks.push(await readTags(files[i]));
      if (i % 10 === 0) win.webContents.send('library:progress', { done: i + 1, total: files.length });
    }
    win.webContents.send('library:progress', { done: files.length, total: files.length });
    return tracks;
  });

  ipcMain.handle('lyrics:local', (_e, file) => {
    const lrc = file.replace(/\.[^.\\/]+$/, '.lrc');
    try { return fs.readFileSync(lrc, 'utf8'); } catch { return null; }
  });

  ipcMain.handle('import:m3u', async () => {
    const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Playlists', extensions: ['m3u', 'm3u8'] }], properties: ['openFile'] });
    if (r.canceled) return null;
    const file = r.filePaths[0];
    const dir = path.dirname(file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const items = [];
    let info = null;
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('#EXTINF')) { info = l.split(',').slice(1).join(','); continue; }
      if (l.startsWith('#')) continue;
      const abs = path.isAbsolute(l) ? l : path.join(dir, l);
      const [artist, title] = info && info.includes(' - ') ? info.split(' - ', 2) : ['', path.basename(l, path.extname(l))];
      items.push({ path: abs, artist: artist.trim(), title: title.trim() });
      info = null;
    }
    return { name: path.basename(file, path.extname(file)), items };
  });

  // Spotify import via Client Credentials (user supplies their own app keys in Settings)
  ipcMain.handle('import:spotify', async (_e, { url, clientId, clientSecret }) => {
    const m = String(url).match(/playlist[/:]([A-Za-z0-9]+)/);
    if (!m) throw new Error('That does not look like a Spotify playlist link.');
    if (!clientId || !clientSecret) throw new Error('Add your Spotify Client ID and Secret in Settings first.');
    const tokRes = await net.fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') },
      body: 'grant_type=client_credentials'
    });
    if (!tokRes.ok) throw new Error('Spotify rejected the Client ID/Secret.');
    const { access_token } = await tokRes.json();
    const auth = { Authorization: `Bearer ${access_token}` };
    const meta = await (await net.fetch(`https://api.spotify.com/v1/playlists/${m[1]}?fields=name`, { headers: auth })).json();
    if (meta.error) throw new Error(`Spotify: ${meta.error.message}`);
    const items = [];
    let next = `https://api.spotify.com/v1/playlists/${m[1]}/tracks?limit=100&fields=next,items(track(name,artists(name),duration_ms))`;
    while (next) {
      const page = await (await net.fetch(next, { headers: auth })).json();
      if (page.error) throw new Error(`Spotify: ${page.error.message}`);
      for (const it of page.items || []) {
        if (it.track) items.push({ title: it.track.name, artist: it.track.artists.map(a => a.name).join(', '), duration: it.track.duration_ms / 1000 });
      }
      next = page.next;
    }
    return { name: meta.name || 'Spotify playlist', items };
  });

  // ---------- get music: links, legal sources, queue, metadata, CD, watch folders ----------
  const cfg = () => ({ ...(readStore().settings || {}) });
  const toWin = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };
  const added = t => toWin('library:added', t);
  const queue = svc.createQueue({ readTags, getCfg: cfg, onUpdate: j => toWin('dl:update', j), onAdded: added });
  const watcher = svc.createWatcher({ readTags, onAdded: added });
  watcher.set(cfg().watchFolders || []);
  const errMsg = fn => async (...a) => { try { return await fn(...a); } catch (e) { throw new Error(e.message || String(e)); } };
  ipcMain.handle('get:resolve', errMsg((_e, url) => svc.resolveLink(url)));
  ipcMain.handle('get:buyLinks', (_e, { title, artist }) => svc.buyLinks(title, artist));
  ipcMain.handle('get:providers', () => svc.providerList());
  ipcMain.handle('get:search', errMsg((_e, q) => svc.searchSources(q, cfg())));
  ipcMain.handle('get:tracks', errMsg((_e, { source, item }) => svc.sourceTracks(source, item, cfg())));
  ipcMain.handle('get:findFree', errMsg((_e, { title, artist }) => svc.findFree(title, artist, cfg())));
  ipcMain.handle('dl:add', (_e, tracks) => queue.add(tracks));
  ipcMain.handle('dl:list', () => queue.list());
  ipcMain.handle('dl:cancel', (_e, id) => queue.cancel(id));
  ipcMain.handle('dl:retry', (_e, id) => queue.retry(id));
  ipcMain.handle('dl:clear', () => queue.clear());
  ipcMain.handle('meta:lookup', errMsg((_e, base) => svc.metaLookup(base)));
  ipcMain.handle('meta:apply', errMsg(async (_e, { file, candidate, base }) => { const m = await svc.metaApply(file, candidate, base); return { match: m, track: await readTags(file) }; }));
  ipcMain.handle('cd:info', errMsg(() => svc.cdInfo()));
  ipcMain.handle('cd:rip', errMsg((_e, info) => { if (!cfg().downloadDir) throw new Error('Choose a download folder in Settings first'); return svc.cdRip(info, cfg(), p => toWin('cd:progress', p), readTags, added); }));
  ipcMain.handle('watch:set', (_e, dirs) => watcher.set(dirs || []));
  ipcMain.handle('dialog:folder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
  ipcMain.handle('shell:open', (_e, p) => { if (fs.existsSync(p)) shell.openPath(p); });

  ipcMain.handle('win:min', () => win.minimize());
  ipcMain.handle('win:max', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
  ipcMain.handle('win:close', () => win.close());
  ipcMain.handle('clipboard:write', (_e, text) => { clipboard.writeText(text); return true; });
  ipcMain.handle('open-external', (_e, url) => { if (/^https?:/.test(url)) shell.openExternal(url); });

  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
