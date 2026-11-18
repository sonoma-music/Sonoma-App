// Sonoma for Android and iOS: implements the same window.sonoma API the desktop preload offers,
// using browser storage (IndexedDB), the device file picker and Capacitor's native HTTP.
// The UI (app/renderer/*) is shared with the desktop app unchanged.
import { parseBlob } from 'music-metadata';
import * as svc from '../../app/services.js';

const Cap = window.Capacitor;
const NATIVE = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const AUDIO = /\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|webm)$/i;

// ---------------------------------------------------------------- storage (IndexedDB)
const dbp = new Promise((resolve, reject) => {
  const r = indexedDB.open('sonoma', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); };
  r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
});
const tx = async (store, mode, fn) => { const db = await dbp; return new Promise((res, rej) => { const t = db.transaction(store, mode); const st = t.objectStore(store); const out = fn(st); t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); }); };
const kvGet = k => tx('kv', 'readonly', s => s.get(k));
const kvSet = (k, v) => tx('kv', 'readwrite', s => s.put(v, k));
const fileGet = k => tx('files', 'readonly', s => s.get(k));
const fileSet = (k, v) => tx('files', 'readwrite', s => s.put(v, k));
const fileDel = k => tx('files', 'readwrite', s => s.delete(k));

const urls = new Map(); // track path -> object URL
async function urlFor(path) {
  if (urls.has(path)) return urls.get(path);
  const blob = await fileGet(path);
  if (!blob) return '';
  const u = URL.createObjectURL(blob); urls.set(path, u); return u;
}

// ---------------------------------------------------------------- tags
const toDataUrl = (bytes, mime) => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(new Blob([bytes], { type: mime || 'image/jpeg' })); });
async function readTags(blob, name, path) {
  const base = String(name || 'Unknown').replace(/\.[^.]+$/, '');
  const [fa, ft] = base.includes(' - ') ? base.split(' - ', 2) : ['', base];
  const t = { id: path, path, title: ft.trim(), artist: fa.trim() || 'Unknown artist', album: '', albumArtist: '', year: null, trackNo: null, duration: 0, cover: null };
  try {
    const m = await parseBlob(blob, { duration: true });
    const c = m.common;
    if (c.title) t.title = c.title; if (c.artist) t.artist = c.artist; if (c.album) t.album = c.album;
    if (c.albumartist) t.albumArtist = c.albumartist; if (c.year) t.year = c.year; if (c.track?.no) t.trackNo = c.track.no;
    t.duration = m.format.duration || 0;
    const pic = c.picture?.[0];
    if (pic && pic.data.length < 400_000) t.cover = await toDataUrl(pic.data, pic.format);
  } catch { /* use the file name */ }
  return t;
}

// ---------------------------------------------------------------- native HTTP (no CORS limits in the app)
// Wraps CapacitorHttp in a fetch-like Response so app/services.js can be reused as-is.
async function nativeFetch(url, opts = {}) {
  const Http = Cap?.Plugins?.CapacitorHttp;
  if (!NATIVE || !Http) { const h = { ...(opts.headers || {}) }; delete h['User-Agent']; return fetch(url, { ...opts, headers: h }); }
  const binary = /\.(jpe?g|png|webp|gif)(\?|$)|coverartarchive|services\/img/.test(url) || opts.binary;
  const r = await Http.request({ url, method: opts.method || 'GET', headers: opts.headers || {}, data: opts.body, responseType: binary ? 'arraybuffer' : 'text' });
  let body = r.data;
  if (binary && typeof body === 'string') body = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  else if (typeof body !== 'string') body = JSON.stringify(body);
  return new Response(r.status === 204 ? null : body, { status: r.status, headers: r.headers || {} });
}
window.__sonomaNet = { fetch: nativeFetch }; // picked up by the electron shim (see build.js)

// ---------------------------------------------------------------- file picking
function pickFiles(accept, multiple = true) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept; inp.multiple = multiple; inp.style.display = 'none';
    let done = false;
    const finish = v => { if (done) return; done = true; inp.remove(); resolve(v); };
    inp.addEventListener('change', () => finish([...inp.files]));
    inp.addEventListener('cancel', () => finish([]));
    document.body.appendChild(inp); inp.click();
  });
}

// ---------------------------------------------------------------- events
const listeners = { progress: [], added: [], dl: [], link: [] };
const emit = (k, v) => listeners[k].forEach(f => { try { f(v); } catch (e) { console.error(e); } });

let state = {};
const cfg = () => ({ ...(state.settings || {}) });

// ---------------------------------------------------------------- download queue (into app storage)
const jobs = [];
let active = 0;
const pub = j => emit('dl', { id: j.id, title: j.title, artist: j.artist, album: j.album, status: j.status, progress: j.progress, error: j.error || null, source: j.source });
async function blobToDataUrl(blob) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }
async function runJob(j) {
  j.status = 'downloading'; j.progress = 0; pub(j);
  const res = await fetch(j.url);
  if (!res.ok) throw new Error(`Source answered ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader(); const parts = []; let got = 0, last = 0;
  for (;;) {
    if (j.cancel) { reader.cancel(); j.status = 'cancelled'; return pub(j); }
    const { done, value } = await reader.read(); if (done) break;
    parts.push(value); got += value.length;
    if (total && Date.now() - last > 300) { j.progress = got / total; last = Date.now(); pub(j); }
  }
  j.status = 'tagging'; j.progress = 1; pub(j);
  const blob = new Blob(parts, { type: j.ext === '.flac' ? 'audio/flac' : 'audio/mpeg' });
  const path = 'idb:' + uid();
  await fileSet(path, blob);
  const t = await readTags(blob, `${j.artist} - ${j.title}${j.ext}`, path);
  Object.assign(t, { title: j.title || t.title, artist: j.artist || t.artist, album: j.album || t.album, albumArtist: j.albumArtist || j.artist || t.albumArtist, year: j.year || t.year, trackNo: j.trackNo || t.trackNo });
  if (!t.cover && j.cover) { try { const r = await nativeFetch(j.cover, { binary: true }); if (r.ok) t.cover = await blobToDataUrl(await r.blob()); } catch { /* no art */ } }
  const ly = await svc.lyricsFor({ title: t.title, artist: t.artist, album: t.album, duration: t.duration });
  if (ly.synced || ly.plain) await kvSet('lrc:' + path, ly.synced || ly.plain);
  emit('added', t);
  j.status = 'done'; pub(j);
}
function pump() {
  const max = Math.max(1, Math.min(3, cfg().concurrency || 2));
  while (active < max) {
    const j = jobs.find(x => x.status === 'queued'); if (!j) return;
    active++;
    runJob(j).catch(e => { j.status = 'error'; j.error = e.message; pub(j); }).finally(() => { active--; pump(); });
  }
}

// ---------------------------------------------------------------- the API
const mobileOnly = msg => async () => { throw new Error(msg); };
window.sonoma = {
  platform: NATIVE ? Cap.getPlatform() : 'web',
  async getStore() {
    state = (await kvGet('state')) || {};
    state.settings = { downloadDir: 'In the app', ...(state.settings || {}) };
    await Promise.all((state.library || []).filter(t => String(t.path).startsWith('idb:')).map(t => urlFor(t.path)));
    return state;
  },
  async setStore(s) { state = s; await kvSet('state', s); return true; },

  async pickLibrary() {
    const files = await pickFiles('audio/*,.flac,.m4a,.opus,.ogg,.mp3,.wav,.lrc');
    const audio = files.filter(f => AUDIO.test(f.name) || /^audio\//.test(f.type));
    const lrcs = new Map(files.filter(f => /\.lrc$/i.test(f.name)).map(f => [f.name.replace(/\.lrc$/i, '').toLowerCase(), f]));
    const out = [];
    for (let i = 0; i < audio.length; i++) {
      const f = audio[i]; const path = 'idb:' + uid();
      await fileSet(path, f);
      const t = await readTags(f, f.name, path);
      const lrc = lrcs.get(f.name.replace(/\.[^.]+$/, '').toLowerCase());
      if (lrc) await kvSet('lrc:' + path, await lrc.text());
      await urlFor(path);
      out.push(t);
      emit('progress', { done: i + 1, total: audio.length });
    }
    return out;
  },
  onLibraryProgress: cb => listeners.progress.push(cb),
  onAdded: cb => listeners.added.push(t => { urlFor(t.path).then(() => cb(t)); }),
  localLyrics: path => kvGet('lrc:' + path).then(v => v || null),
  mediaUrl: path => urls.get(path) || '',

  async importM3U() {
    const [f] = await pickFiles('.m3u,.m3u8,audio/x-mpegurl', false);
    if (!f) return null;
    const items = []; let info = null;
    for (const line of (await f.text()).split(/\r?\n/)) {
      const l = line.trim(); if (!l) continue;
      if (l.startsWith('#EXTINF')) { info = l.split(',').slice(1).join(','); continue; }
      if (l.startsWith('#')) continue;
      const name = l.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
      const [artist, title] = info && info.includes(' - ') ? info.split(' - ', 2) : ['', name];
      items.push({ artist: artist.trim(), title: title.trim() }); info = null;
    }
    return { name: f.name.replace(/\.[^.]+$/, ''), items };
  },
  async importSpotify({ url, clientId, clientSecret }) {
    const m = String(url).match(/playlist[/:]([A-Za-z0-9]+)/);
    if (!m) throw new Error('That does not look like a Spotify playlist link.');
    if (!clientId || !clientSecret) throw new Error('Add your Spotify Client ID and Secret in Settings first.');
    const tok = await nativeFetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`) }, body: 'grant_type=client_credentials' });
    if (!tok.ok) throw new Error('Spotify rejected the Client ID/Secret.');
    const { access_token } = await tok.json();
    const auth = { Authorization: `Bearer ${access_token}` };
    const meta = await (await nativeFetch(`https://api.spotify.com/v1/playlists/${m[1]}?fields=name`, { headers: auth })).json();
    const items = [];
    let next = `https://api.spotify.com/v1/playlists/${m[1]}/tracks?limit=100&fields=next,items(track(name,artists(name),duration_ms))`;
    while (next) {
      const page = await (await nativeFetch(next, { headers: auth })).json();
      if (page.error) throw new Error(`Spotify: ${page.error.message}`);
      for (const it of page.items || []) if (it.track) items.push({ title: it.track.name, artist: it.track.artists.map(a => a.name).join(', ') });
      next = page.next;
    }
    return { name: meta.name || 'Spotify playlist', items };
  },

  // Get music
  resolveLink: url => svc.resolveLink(url),
  buyLinks: ({ title, artist }) => Promise.resolve(svc.buyLinks(title, artist)),
  providers: () => Promise.resolve(svc.providerList()),
  searchSources: q => svc.searchSources(q, cfg()),
  sourceTracks: ({ source, item }) => svc.sourceTracks(source, item, cfg()),
  findFree: ({ title, artist }) => svc.findFree(title, artist, cfg()),
  async dlAdd(tracks) { for (const t of tracks) { if (!/^https:\/\//.test(t.url || '')) continue; const j = { ...t, id: uid(), status: 'queued', progress: 0 }; jobs.push(j); pub(j); } pump(); return this.dlList(); },
  dlList: () => Promise.resolve(jobs.map(j => ({ id: j.id, title: j.title, artist: j.artist, album: j.album, status: j.status, progress: j.progress, error: j.error || null }))),
  dlCancel(id) { const j = jobs.find(x => x.id === id); if (!j) return; if (j.status === 'queued') { j.status = 'cancelled'; pub(j); } else j.cancel = true; },
  dlRetry(id) { const j = jobs.find(x => x.id === id); if (j && /error|cancelled/.test(j.status)) { j.status = 'queued'; j.error = null; j.cancel = false; pub(j); pump(); } },
  dlClear() { for (let i = jobs.length - 1; i >= 0; i--) if (/done|cancelled|error/.test(jobs[i].status)) jobs.splice(i, 1); return this.dlList(); },
  onDl: cb => listeners.dl.push(cb),

  // metadata: phones can't rewrite tags inside files, so the library entry is updated instead
  metaLookup: base => svc.metaLookup(base),
  async metaApply({ file, candidate, base }) {
    const m = candidate || (await svc.metaLookup(base))[0];
    if (!m) throw new Error('No match on MusicBrainz');
    const t = (state.library || []).find(x => x.path === file) || { ...base };
    const track = { ...t, title: m.title, artist: m.artist, album: m.album, albumArtist: m.albumArtist, year: m.year, trackNo: m.trackNo };
    if (m.releaseId) { try { const r = await nativeFetch(`https://coverartarchive.org/release/${m.releaseId}/front-500`, { binary: true }); if (r.ok) track.cover = await blobToDataUrl(await r.blob()); } catch { /* keep art */ } }
    const ly = await svc.lyricsFor({ title: m.title, artist: m.artist, album: m.album, duration: t.duration });
    if (ly.synced || ly.plain) await kvSet('lrc:' + file, ly.synced || ly.plain);
    return { match: m, track };
  },

  // desktop-only features
  cdInfo: async () => ({ supported: false, reason: 'CD ripping needs a computer with a disc drive. Use Sonoma for Windows, macOS or Linux.' }),
  cdRip: mobileOnly('CD ripping is only available on desktop.'),
  onCd() {},
  setWatch: async () => [],
  pickFolder: async () => null,
  openPath() {},

  // window & misc
  winMin() {}, winMax() {}, winClose() {},
  copy: text => navigator.clipboard.writeText(text).catch(() => {}),
  openExternal: url => { if (/^https?:/.test(url)) window.open(url, '_blank'); },
  onOpenLink: cb => listeners.link.push(cb)
};

// forget the audio file when a song is removed from the library
const origSet = window.sonoma.setStore;
window.sonoma.setStore = async s => {
  const keep = new Set((s.library || []).map(t => t.path));
  for (const p of [...urls.keys()]) if (!keep.has(p)) { URL.revokeObjectURL(urls.get(p)); urls.delete(p); fileDel(p).catch(() => {}); }
  return origSet(s);
};
document.documentElement.classList.add('mobile', 'platform-' + window.sonoma.platform);
