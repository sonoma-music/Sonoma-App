// Sonoma renderer: library, albums, player, playlists, lyrics, import, smart links, rooms, profile.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { s = Number.isFinite(s) ? Math.max(0, Math.floor(s)) : 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtLong = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h} hr ${m} min` : `${m} min ${x} sec`; };
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------------- icons ----------------
const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  library: '<path d="M6 3h9a2 2 0 0 1 2 2v16l-6.5-4L4 21V5a2 2 0 0 1 2-2z"/><path d="M20 7v14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<path d="M18 5v14a1 1 0 0 1-1.5.8L7 13a1.2 1.2 0 0 1 0-2l9.5-6.8A1 1 0 0 1 18 5z" fill="currentColor" stroke="none"/><path d="M5 5v14"/>',
  next: '<path d="M6 5v14a1 1 0 0 0 1.5.8L17 13a1.2 1.2 0 0 0 0-2L7.5 4.2A1 1 0 0 0 6 5z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V10a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.6-9.2C.9 8 3 4.5 6.6 4.5c2.2 0 3.6 1.2 5.4 3.2 1.8-2 3.2-3.2 5.4-3.2 3.6 0 5.7 3.5 4.2 6.8-2.1 4.6-9.6 9.2-9.6 9.2z"/>',
  heartF: '<path d="M12 20.5s-7.5-4.6-9.6-9.2C.9 8 3 4.5 6.6 4.5c2.2 0 3.6 1.2 5.4 3.2 1.8-2 3.2-3.2 5.4-3.2 3.6 0 5.7 3.5 4.2 6.8-2.1 4.6-9.6 9.2-9.6 9.2z" fill="currentColor"/>',
  kebab: '<path d="M12 5h.01M12 12h.01M12 19h.01" stroke-width="3.2"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sort: '<path d="M4 6h9M4 12h6M4 18h3M17 5v14M14 16l3 3 3-3"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  vol: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  volx: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  queue: '<path d="M3 6h13M3 12h13M3 18h8M18 14v7M14.5 17.5h7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  next2: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  homeF: '<path d="M10.6 3.5a2.2 2.2 0 0 1 2.8 0l6.8 5.6c.5.4.8 1 .8 1.7V19a2 2 0 0 1-2 2h-3.5a1 1 0 0 1-1-1v-4.5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1V20a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2v-8.2c0-.7.3-1.3.8-1.7z" fill="currentColor" stroke="none"/>',
  searchF: '<circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" fill-opacity=".35"/><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5" stroke-width="2.6"/>',
  libraryF: '<path d="M8 3h9a2 2 0 0 1 2 2v15.2a.8.8 0 0 1-1.2.7L12.5 18l-5.3 2.9a.8.8 0 0 1-1.2-.7V5a2 2 0 0 1 2-2z" fill="currentColor" stroke="none"/><path d="M4 7v13.5" stroke-width="2.2"/>',
  usersF: '<circle cx="9" cy="8" r="4" fill="currentColor" stroke="none"/><path d="M2 20a7 7 0 0 1 14 0v.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5z" fill="currentColor" stroke="none"/><path d="M16 4.2a4 4 0 0 1 0 7.6M18.5 14.5A6 6 0 0 1 22 20"/>',
  settingsF: '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M10.3 2h3.4l.6 2.7c.7.3 1.4.7 2 1.2l2.6-.9 1.7 3-2 1.8a7.6 7.6 0 0 1 0 2.4l2 1.8-1.7 3-2.6-.9c-.6.5-1.3.9-2 1.2l-.6 2.7h-3.4l-.6-2.7a7.7 7.7 0 0 1-2-1.2l-2.6.9-1.7-3 2-1.8a7.6 7.6 0 0 1 0-2.4l-2-1.8 1.7-3 2.6.9c.6-.5 1.3-.9 2-1.2zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>',
  autoplay: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/>',
  min: '<path d="M5 12h14"/>', max: '<rect x="5" y="5" width="14" height="14" rx="2"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>'
};
const ic = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[name] || ''}</svg>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-ic]').forEach(el => { const old = el.querySelector(':scope > svg'); if (old) old.remove(); el.insertAdjacentHTML('afterbegin', ic(el.dataset.ic)); });
}
function setIc(el, name) { el.dataset.ic = name; const old = el.querySelector(':scope > svg'); if (old) old.remove(); el.insertAdjacentHTML('afterbegin', ic(name)); }

// ---------------- state ----------------
const DEFAULTS = {
  library: [], playlists: [], favorites: [],
  profile: { name: 'Listener', avatar: '🎧', color: '#3d85c6', bio: '' },
  settings: { roomServer: 'ws://localhost:8787', spotifyId: '', spotifySecret: '', telemetry: false, volume: 80 }
};
let S = structuredClone(DEFAULTS);
let view = 'home', viewArg = null, filter = '', sortMode = 'default';
const audio = $('#audio');
const P = { queue: [], index: -1, shuffle: false, repeat: 'off', current: null };
let saveTimer;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => window.sonoma.setStore(S), 300); }
const byId = id => S.library.find(t => t.id === id);

// ---------------- albums ----------------
let albumCache = null;
function albums() {
  if (albumCache) return albumCache;
  const map = new Map();
  for (const t of S.library) {
    const artist = t.albumArtist || t.artist;
    const key = `${artist}::${t.album || 'Unknown album'}`;
    if (!map.has(key)) map.set(key, { key, title: t.album || 'Unknown album', artist, year: t.year, cover: t.cover, tracks: [] });
    const a = map.get(key); a.tracks.push(t);
    if (!a.cover && t.cover) a.cover = t.cover;
    if (!a.year && t.year) a.year = t.year;
  }
  for (const a of map.values()) a.tracks.sort((x, y) => (x.trackNo || 999) - (y.trackNo || 999) || x.title.localeCompare(y.title));
  albumCache = [...map.values()].sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
  return albumCache;
}
const albumOf = t => albums().find(a => a.tracks.includes(t));
function libraryChanged() { albumCache = null; save(); }

// ---------------- ui helpers ----------------
function toast(msg) { const d = document.createElement('div'); d.textContent = msg; $('#toast').appendChild(d); setTimeout(() => d.remove(), 2800); }
function ask(title, value = '', ok = 'Save') {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="box"><h3>${esc(title)}</h3><input id="askIn" value="${esc(value)}"><div class="row"><button class="btn" id="askNo">Cancel</button><button class="btn light" id="askOk">${esc(ok)}</button></div></div>`;
    m.classList.remove('hidden');
    const inp = $('#askIn'); inp.focus(); inp.select();
    const done = v => { m.classList.add('hidden'); res(v); };
    $('#askOk').onclick = () => done(inp.value.trim() || null);
    $('#askNo').onclick = () => done(null);
    inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value.trim() || null); if (e.key === 'Escape') done(null); };
  });
}
function confirmBox(title) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="box"><h3>${esc(title)}</h3><div class="row"><button class="btn" id="cNo">Cancel</button><button class="btn light" id="cOk">Yes</button></div></div>`;
    m.classList.remove('hidden');
    $('#cOk').onclick = () => { m.classList.add('hidden'); res(true); };
    $('#cNo').onclick = () => { m.classList.add('hidden'); res(false); };
  });
}
function showMenu(x, y, items) {
  const m = $('#menu'); m.innerHTML = '';
  for (const it of items) {
    if (it === '-') { m.appendChild(document.createElement('hr')); continue; }
    if (it.label) { const d = document.createElement('div'); d.className = 'lbl'; d.textContent = it.label; m.appendChild(d); continue; }
    const b = document.createElement('button'); b.innerHTML = `${it.icon ? ic(it.icon) : ''}<span>${esc(it.text)}</span>`;
    b.onclick = () => { hideMenu(); it.action(); };
    m.appendChild(b);
  }
  m.classList.remove('hidden');
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
}
function hideMenu() { $('#menu').classList.add('hidden'); }
document.addEventListener('mousedown', e => { if (!e.target.closest('#menu')) hideMenu(); });
const coverHTML = (src, cls = '') => `<div class="cover ${cls}" ${src ? `style="background-image:url('${src}')"` : ''}>${src ? '' : ic('music')}</div>`;
function setRange(el) { el.style.setProperty('--p', (el.value / el.max * 100) + '%'); }

// dynamic tint from cover art
const tintCache = new Map();
function applyTint(src) {
  $('#bgImg').style.backgroundImage = src ? `url('${src}')` : 'none';
  if (!src) { document.documentElement.style.setProperty('--tint', '30,110,210'); return; }
  if (tintCache.has(src)) { document.documentElement.style.setProperty('--tint', tintCache.get(src)); return; }
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    let r = 0, gg = 0, b = 0, w = 0;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      const sat = mx ? (mx - mn) / mx : 0, wt = 0.15 + sat * sat * (mx > 40 ? 1 : 0.1);
      r += d[i] * wt; gg += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
    }
    let rgb = [r / w, gg / w, b / w];
    const hi = Math.max(...rgb), lo = Math.min(...rgb);
    if (!hi || (hi - lo) / hi < 0.25) rgb = rgb.map((v, k) => v * 0.15 + [30, 90, 170][k] * 0.85); // grey art: lean towards the default blue
    const mx = Math.max(...rgb); if (mx > 170) rgb = rgb.map(v => v * 170 / mx); // keep text readable
    const val = rgb.map(Math.round).join(',');
    tintCache.set(src, val); document.documentElement.style.setProperty('--tint', val);
  };
  img.src = src;
}
function updateTint() {
  if (view === 'album') { const a = albums().find(x => x.key === viewArg); if (a) return applyTint(a.cover); }
  applyTint(P.current?.cover || null);
}

// ---------------- matching ----------------
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/feat\..*$/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function matchTrack(title, artist) {
  const nt = norm(title), na = norm(artist);
  const sameTitle = S.library.filter(t => norm(t.title) === nt);
  if (!sameTitle.length) return null;
  if (na) {
    const hit = sameTitle.find(t => { const a = norm(t.artist); return a && (a.includes(na) || na.includes(a) || a.split(' ')[0] === na.split(' ')[0]); });
    if (hit) return hit;
  }
  return sameTitle.length === 1 ? sameTitle[0] : null;
}
function makePlaylist(name, items) {
  const pl = { id: uid(), name, items: items.map(it => {
    const t = (it.path && byId(it.path)) || matchTrack(it.title, it.artist);
    return { trackId: t ? t.id : null, title: t ? t.title : it.title, artist: t ? t.artist : it.artist };
  }) };
  S.playlists.push(pl); save();
  toast(`"${name}": ${pl.items.filter(i => i.trackId).length}/${pl.items.length} tracks found in your library`);
  go('playlist', pl.id);
}

// ---------------- navigation ----------------
document.querySelector('#rail').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) go(b.dataset.view); });
$('#wMin').onclick = () => window.sonoma.winMin();
$('#wMax').onclick = () => window.sonoma.winMax();
$('#wClose').onclick = () => window.sonoma.winClose();
const VIEWS = {}, VIEWS_EXTRA = {}; // extra views are registered by get.js
const NAV_OF = { home: 'home', album: 'home', search: 'search', library: 'library', playlist: 'library', favorites: 'library', import: 'library', rooms: 'rooms', get: 'get' };
function go(v, arg = null) { view = v; viewArg = arg; filter = ''; sortMode = 'default'; render(); $('#main').scrollTop = 0; }
function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.view === NAV_OF[view]));
  const pr = S.profile;
  $('#meChip').innerHTML = `<span class="av" style="background:${esc(pr.color)}">${esc(pr.avatar)}</span>`;
  const main = $('#main');
  Object.assign(VIEWS, { home: vHome, search: vSearch, library: vLibrary, album: vAlbum, favorites: vFavorites, playlist: vPlaylist, rooms: vRooms, import: vImport, profile: vProfile, settings: vSettings }, VIEWS_EXTRA);
  (VIEWS[view] || vHome)(main);
  hydrateIcons(main);
  updateTint();
}

// ---------------- track list ----------------
// rows: [{trackId, title?, artist?}]
function listHTML(rows, { showArtist = true, showAlbum = false, showCover = false, numbers = 'index' } = {}) {
  if (!rows.length) return '';
  return `<div class="list ${showAlbum ? '' : 'noalbum'}">${rows.map((r, i) => {
    const t = r.trackId ? byId(r.trackId) : null;
    const title = t ? t.title : r.title, artist = t ? t.artist : r.artist;
    const playing = t && P.current && P.current.id === t.id;
    const num = numbers === 'trackNo' && t?.trackNo ? t.trackNo : i + 1;
    return `<div class="tr ${playing ? 'playing' : ''} ${t ? '' : 'missing'}" data-i="${i}">
      <div class="n">${playing ? `<span class="num ${audio.paused ? 'paused' : ''}"><span class="eq"><i></i><i></i><i></i></span></span>` : `<span class="num">${num}</span>`}<span class="play-ic">${ic('play')}</span></div>
      <div class="ttl">${showCover ? coverHTML(t?.cover) : ''}<div style="min-width:0"><div class="tt">${t?.explicit ? '<i class="ex">E</i>' : ''}${esc(title)}</div>${showArtist || !t ? `<span class="ta">${esc(artist)}${t ? '' : ' · not in library'}</span>` : ''}</div></div>
      ${showAlbum ? `<div class="al">${esc(t?.album || '')}</div>` : ''}
      <div class="d">${t ? fmt(t.duration) : ''}</div>
      <button class="k" data-more="${i}">${ic('kebab')}</button></div>`;
  }).join('')}</div>`;
}
function bindList(root, rows, ctx = {}) {
  const ids = rows.map(r => r.trackId);
  const playAt = i => { if (!ids[i]) return toast('This track is not in your library'); const q = ids.filter(Boolean); playList(q, q.indexOf(ids[i])); };
  root.querySelectorAll('.tr[data-i]').forEach(tr => {
    tr.ondblclick = () => playAt(+tr.dataset.i);
    tr.querySelector('.n').onclick = () => playAt(+tr.dataset.i);
    tr.oncontextmenu = e => { e.preventDefault(); trackMenu(e.clientX, e.clientY, rows[+tr.dataset.i], +tr.dataset.i, ctx); };
  });
  root.querySelectorAll('[data-more]').forEach(b => b.onclick = e => { e.stopPropagation(); const r = b.getBoundingClientRect(); trackMenu(r.right - 210, r.bottom + 4, rows[+b.dataset.more], +b.dataset.more, ctx); });
}
function trackMenu(x, y, row, idx, ctx) {
  const t = row.trackId ? byId(row.trackId) : null;
  const items = [];
  if (t) {
    items.push({ icon: 'play', text: 'Play', action: () => playList([t.id], 0) });
    items.push({ icon: 'next2', text: 'Play next', action: () => { P.queue.splice(P.index + 1, 0, t.id); renderQueue(); toast('Playing next'); } });
    items.push({ icon: 'queue', text: 'Add to queue', action: () => addToQueue([t.id]) });
    items.push({ icon: S.favorites.includes(t.id) ? 'heartF' : 'heart', text: S.favorites.includes(t.id) ? 'Remove from favorites' : 'Add to favorites', action: () => toggleFav(t.id) });
    const al = albumOf(t); if (al && view !== 'album') items.push({ icon: 'music', text: 'Go to album', action: () => go('album', al.key) });
  }
  items.push({ icon: 'link', text: 'Copy smart link', action: () => copyLink(trackLink(t || row)) });
  if (t) {
    items.push('-', { label: 'Add to playlist' }, { icon: 'plus', text: 'New playlist…', action: async () => { const n = await ask('New playlist', 'My playlist', 'Create'); if (n) { S.playlists.push({ id: uid(), name: n, items: [{ trackId: t.id, title: t.title, artist: t.artist }] }); save(); toast(`Added to ${n}`); } } });
    S.playlists.forEach(p => items.push({ icon: 'library', text: p.name, action: () => { p.items.push({ trackId: t.id, title: t.title, artist: t.artist }); save(); toast(`Added to ${p.name}`); } }));
  }
  if (ctx.playlist) items.push('-', { icon: 'trash', text: 'Remove from playlist', action: () => { ctx.playlist.items.splice(idx, 1); save(); render(); } });
  if (t && !ctx.playlist) items.push('-', { icon: 'trash', text: 'Remove from library', action: () => { S.library = S.library.filter(x => x !== t); libraryChanged(); render(); } });
  showMenu(x, y, items);
}
function addToQueue(ids) {
  if (!ids.length) return;
  if (!P.current) return playList(ids, 0);
  P.queue.push(...ids); renderQueue(); toast(ids.length > 1 ? `Added ${ids.length} tracks to queue` : 'Added to queue');
}
function sortRows(rows) {
  if (sortMode === 'default') return rows;
  const get = r => byId(r.trackId) || r;
  const f = { title: (a, b) => get(a).title.localeCompare(get(b).title), artist: (a, b) => (get(a).artist || '').localeCompare(get(b).artist || ''), duration: (a, b) => (get(a).duration || 0) - (get(b).duration || 0) }[sortMode];
  return rows.slice().sort(f);
}

// Header + list page used by album, playlist and favorites
function collectionPage(main, { cover, title, by, chips, rows, listOpts, ctx, more }) {
  const ids = () => rows.map(r => r.trackId).filter(Boolean);
  const total = rows.reduce((a, r) => a + (byId(r.trackId)?.duration || 0), 0);
  main.innerHTML = `<div class="hero">${coverHTML(cover, 'art')}
    <div class="hero-info"><h1>${esc(title)}</h1><div class="by">${by}</div>
      <div class="chips">${(chips || []).map(c => `<span class="chip">${esc(c)}</span>`).join('')}<span class="chip">${ic('music')} ${rows.length} tracks <span class="sepdot">•</span> ${fmtLong(total)}</span></div>
      <div class="actions">
        <button class="btn light" id="hPlay">${ic('play')} Play all</button>
        <button class="btn sq" id="hShuf" title="Shuffle">${ic('shuffle')}</button>
        <span class="grow"></span>
        <label class="sbox">${ic('search')}<input id="hSearch" placeholder="Search in ${esc(ctx.kind || 'list')}" value="${esc(filter)}"></label>
        <button class="btn" id="hQueue">${ic('plus')} Add to queue</button>
        <button class="btn sq" id="hSort" title="Sort">${ic('sort')}</button>
        <button class="btn sq" id="hMore" title="More">${ic('dots')}</button>
      </div></div></div>
    <div id="listWrap"></div>`;
  const drawList = () => {
    const q = norm(filter);
    const vis = sortRows(rows).filter(r => { if (!q) return true; const t = byId(r.trackId) || r; return norm(`${t.title} ${t.artist}`).includes(q); });
    $('#listWrap').innerHTML = listHTML(vis, listOpts) || `<p class="empty">${rows.length ? 'No matches.' : ctx.emptyText || 'Nothing here yet.'}</p>`;
    bindList($('#listWrap'), vis, ctx);
  };
  drawList();
  $('#hPlay').onclick = () => { P.shuffle = false; syncModeBtns(); playList(ids(), 0); };
  $('#hShuf').onclick = () => { P.shuffle = true; syncModeBtns(); const q = ids(); playList(q, Math.floor(Math.random() * q.length)); };
  $('#hQueue').onclick = () => addToQueue(ids());
  $('#hSearch').oninput = e => { filter = e.target.value; drawList(); };
  $('#hSort').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(r.left, r.bottom + 4, [
    { label: 'Sort by' },
    ...[['default', ctx.kind === 'album' ? 'Track number' : 'Custom order'], ['title', 'Title'], ['artist', 'Artist'], ['duration', 'Duration']].map(([k, l]) => ({ icon: sortMode === k ? 'play' : null, text: l, action: () => { sortMode = k; drawList(); } }))
  ]); };
  $('#hMore').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(r.right - 220, r.bottom + 4, more()); };
}

// ---------------- views ----------------
function vHome(main) {
  const al = albums();
  const h = new Date().getHours();
  const greet = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  if (!S.library.length) {
    main.innerHTML = `<div class="ph"><h1>${greet}, ${esc(S.profile.name)}</h1></div>
      <div class="empty"><h2>Your library is empty</h2><p>Add a folder with music files (mp3, flac, m4a, ogg, wav, opus).</p><button class="btn light" id="addFolder">${ic('folder')} Add folder</button><div id="scan" class="sub" style="margin-top:12px"></div></div>`;
    $('#addFolder').onclick = addFolder; return;
  }
  const recent = S.library.slice(-8).reverse();
  main.innerHTML = `<div class="ph"><h1>${greet}, ${esc(S.profile.name)}</h1><span class="grow"></span><span id="scan" class="sub"></span><button class="btn" id="addFolder">${ic('folder')} Add folder</button></div>
    ${S.playlists.length ? `<h2 class="sec">Your playlists</h2><div class="grid">${S.playlists.slice(0, 6).map(p => { const c = p.items.map(i => byId(i.trackId)?.cover).find(Boolean); return `<div class="tile" data-pl="${p.id}">${coverHTML(c)}<b>${esc(p.name)}</b><span>${p.items.length} tracks</span></div>`; }).join('')}</div>` : ''}
    <h2 class="sec">Albums</h2><div class="grid">${al.map(a => `<div class="tile" data-al="${esc(a.key)}">${coverHTML(a.cover)}<b>${esc(a.title)}</b><span>${esc(a.artist)}${a.year ? ' · ' + a.year : ''}</span></div>`).join('')}</div>
    <h2 class="sec">Recently added</h2><div id="recent"></div>`;
  const rows = recent.map(t => ({ trackId: t.id }));
  $('#recent').innerHTML = listHTML(rows, { showCover: true, showAlbum: true }); bindList($('#recent'), rows);
  main.querySelectorAll('[data-al]').forEach(el => el.onclick = () => go('album', el.dataset.al));
  main.querySelectorAll('[data-pl]').forEach(el => el.onclick = () => go('playlist', el.dataset.pl));
  $('#addFolder').onclick = addFolder;
}
async function addFolder() {
  const tracks = await window.sonoma.pickLibrary();
  if (!tracks.length) return;
  let added = 0;
  for (const t of tracks) { const i = S.library.findIndex(x => x.id === t.id); if (i >= 0) S.library[i] = t; else { S.library.push(t); added++; } }
  S.playlists.forEach(p => p.items.forEach(it => { if (!it.trackId) { const m = matchTrack(it.title, it.artist); if (m) it.trackId = m.id; } }));
  libraryChanged(); toast(`Added ${added} new tracks`); render();
}
window.sonoma.onLibraryProgress(p => { const el = $('#scan'); if (el) el.textContent = p.done < p.total ? `Scanning ${p.done}/${p.total}…` : ''; });

function vAlbum(main) {
  const a = albums().find(x => x.key === viewArg);
  if (!a) return go('home');
  collectionPage(main, {
    cover: a.cover, title: a.title, by: esc(a.artist), chips: a.year ? [String(a.year)] : [],
    rows: a.tracks.map(t => ({ trackId: t.id })), listOpts: { showArtist: a.tracks.some(t => t.artist !== a.artist), numbers: 'trackNo' },
    ctx: { kind: 'album' },
    more: () => [
      { icon: 'link', text: 'Copy smart link', action: () => copyLink(playlistLink({ name: a.title, items: a.tracks.map(t => ({ trackId: t.id })) })) },
      { icon: 'library', text: 'Save as playlist', action: () => makePlaylist(a.title, a.tracks.map(t => ({ path: t.id }))) }
    ]
  });
}
function vPlaylist(main) {
  const pl = S.playlists.find(p => p.id === viewArg);
  if (!pl) return go('library');
  const cover = pl.items.map(i => byId(i.trackId)?.cover).find(Boolean);
  collectionPage(main, {
    cover, title: pl.name, by: `<span class="av" style="display:inline-grid;width:20px;height:20px;font-size:11px;vertical-align:-4px;background:${esc(S.profile.color)}">${esc(S.profile.avatar)}</span> ${esc(S.profile.name)}`,
    chips: ['Playlist'], rows: pl.items, listOpts: { showCover: true, showAlbum: true }, ctx: { kind: 'playlist', playlist: pl, emptyText: 'Use the ⋮ menu on any song to add it here.' },
    more: () => plMenu(pl)
  });
}
function vFavorites(main) {
  const rows = S.favorites.filter(byId).map(id => ({ trackId: id }));
  collectionPage(main, {
    cover: byId(rows[0]?.trackId)?.cover, title: 'Favorites', by: 'Songs you loved', chips: [], rows,
    listOpts: { showCover: true, showAlbum: true }, ctx: { kind: 'favorites', emptyText: 'Tap ♡ on any song to save it here.' },
    more: () => [{ icon: 'library', text: 'Save as playlist', action: () => makePlaylist('Favorites', rows.map(r => ({ path: r.trackId }))) }]
  });
}
function plMenu(pl) {
  return [
    { icon: 'link', text: 'Copy smart link', action: () => copyLink(playlistLink(pl)) },
    { icon: 'edit', text: 'Rename', action: async () => { const n = await ask('Rename playlist', pl.name); if (n) { pl.name = n; save(); render(); } } },
    '-',
    { icon: 'trash', text: 'Delete playlist', action: async () => { if (await confirmBox(`Delete "${pl.name}"?`)) { S.playlists = S.playlists.filter(p => p !== pl); save(); go('library'); } } }
  ];
}

function vSearch(main) {
  main.innerHTML = `<div class="ph"><h1>Search</h1></div><label class="bigsearch">${ic('search')}<input id="sq" placeholder="Songs, artists, albums" value="${esc(filter)}"></label><div id="sres"></div>`;
  const draw = () => {
    const q = norm(filter), box = $('#sres');
    if (!q) { box.innerHTML = `<p class="empty">Search across ${S.library.length} tracks and ${albums().length} albums.</p>`; return; }
    const tr = S.library.filter(t => norm(`${t.title} ${t.artist} ${t.album}`).includes(q)).slice(0, 50).map(t => ({ trackId: t.id }));
    const al = albums().filter(a => norm(`${a.title} ${a.artist}`).includes(q)).slice(0, 12);
    box.innerHTML = (al.length ? `<h2 class="sec">Albums</h2><div class="grid">${al.map(a => `<div class="tile" data-al="${esc(a.key)}">${coverHTML(a.cover)}<b>${esc(a.title)}</b><span>${esc(a.artist)}</span></div>`).join('')}</div>` : '')
      + (tr.length ? `<h2 class="sec">Songs</h2><div id="strk"></div>` : '') + (!tr.length && !al.length ? '<p class="empty">No results.</p>' : '');
    if (tr.length) { $('#strk').innerHTML = listHTML(tr, { showCover: true, showAlbum: true }); bindList($('#strk'), tr); }
    box.querySelectorAll('[data-al]').forEach(el => el.onclick = () => go('album', el.dataset.al));
  };
  const inp = $('#sq'); inp.oninput = () => { filter = inp.value; draw(); }; inp.focus(); draw();
}

function vLibrary(main) {
  const favCover = byId(S.favorites[0])?.cover;
  main.innerHTML = `<div class="ph"><h1>Library</h1><span class="grow"></span><button class="btn" id="lImport">${ic('download')} Import</button><button class="btn light" id="lNew">${ic('plus')} New playlist</button></div>
    <div class="grid">
      <div class="tile" id="lFav"><div class="cover" style="background:linear-gradient(135deg,#ff6b9a,#7a5cff)${favCover ? '' : ''}">${ic('heartF')}</div><b>Favorites</b><span>${S.favorites.filter(byId).length} tracks</span></div>
      ${S.playlists.map(p => { const c = p.items.map(i => byId(i.trackId)?.cover).find(Boolean); return `<div class="tile" data-pl="${p.id}">${coverHTML(c)}<b>${esc(p.name)}</b><span>Playlist · ${p.items.length} tracks</span></div>`; }).join('')}
    </div>
    <h2 class="sec">All songs</h2><div id="allSongs"></div>`;
  const rows = S.library.slice().sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title)).map(t => ({ trackId: t.id }));
  $('#allSongs').innerHTML = listHTML(rows, { showCover: true, showAlbum: true }) || '<p class="empty">No songs yet. Add a folder from Home.</p>';
  bindList($('#allSongs'), rows);
  $('#lFav').onclick = () => go('favorites');
  main.querySelectorAll('[data-pl]').forEach(el => { el.onclick = () => go('playlist', el.dataset.pl); el.oncontextmenu = e => { e.preventDefault(); showMenu(e.clientX, e.clientY, plMenu(S.playlists.find(p => p.id === el.dataset.pl))); }; });
  $('#lImport').onclick = () => go('import');
  $('#lNew').onclick = async () => { const name = await ask('New playlist', 'My playlist', 'Create'); if (!name) return; const pl = { id: uid(), name, items: [] }; S.playlists.push(pl); save(); go('playlist', pl.id); };
}

// ---------------- import & smart links ----------------
function vImport(main) {
  main.innerHTML = `<div class="ph"><h1>Import</h1><span class="sub">Bring your playlists into Sonoma. Songs are matched against your library.</span></div>
  <div class="cards">
    <div class="card"><h3>Spotify playlist</h3><p>Paste a public playlist link. Needs your own Spotify app keys in Settings (free at developer.spotify.com).</p>
      <div class="row"><input id="spUrl" placeholder="https://open.spotify.com/playlist/…"><button class="btn light" id="spGo">Import</button></div></div>
    <div class="card"><h3>M3U / M3U8 file</h3><p>Exported from Winamp, foobar2000, VLC, iTunes and most players.</p><button class="btn light" id="m3uGo">${ic('folder')} Choose file…</button></div>
    <div class="card"><h3>Track list (SoundCloud, YouTube, anything)</h3><p>One song per line as <b>Artist - Title</b>.</p>
      <div class="field"><input id="txName" placeholder="Playlist name"></div>
      <div class="field"><textarea id="txList" rows="5" placeholder="Artist - Song title"></textarea></div>
      <button class="btn light" id="txGo">Create playlist</button></div>
    <div class="card"><h3>Open a smart link</h3><p>Paste a <b>sonoma://</b> link someone shared with you.</p>
      <div class="row"><input id="slIn" placeholder="sonoma://…"><button class="btn light" id="slGo">Open</button></div></div>
  </div>`;
  $('#spGo').onclick = async () => {
    const b = $('#spGo'); b.disabled = true; b.textContent = 'Importing…';
    try { const r = await window.sonoma.importSpotify({ url: $('#spUrl').value, clientId: S.settings.spotifyId, clientSecret: S.settings.spotifySecret }); makePlaylist(r.name, r.items); }
    catch (e) { toast(String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); b.disabled = false; b.textContent = 'Import'; }
  };
  $('#m3uGo').onclick = async () => { const r = await window.sonoma.importM3U(); if (r) makePlaylist(r.name, r.items); };
  $('#txGo').onclick = () => {
    const items = $('#txList').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const [a, ...t] = l.split(' - '); return t.length ? { artist: a, title: t.join(' - ') } : { artist: '', title: a }; });
    if (!items.length) return toast('Add at least one song');
    makePlaylist($('#txName').value.trim() || 'Imported playlist', items);
  };
  $('#slGo').onclick = () => openLink($('#slIn').value.trim());
}
const b64e = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
const trackLink = t => `sonoma://track?${new URLSearchParams({ t: t.title, a: t.artist })}`;
function playlistLink(pl) {
  const items = pl.items.map(i => { const t = i.trackId && byId(i.trackId); return [t ? t.title : i.title, t ? t.artist : i.artist]; });
  return `sonoma://playlist?d=${b64e(JSON.stringify({ n: pl.name, i: items }))}`;
}
function copyLink(link) { window.sonoma.copy(link); toast('Smart link copied'); }
function openLink(link) {
  try {
    const u = new URL(link);
    if (u.protocol !== 'sonoma:') throw 0;
    const kind = u.hostname || u.pathname.replace(/^\/+/, '');
    if (kind === 'track') {
      const t = matchTrack(u.searchParams.get('t'), u.searchParams.get('a'));
      if (t) { playList([t.id], 0); toast(`Playing ${t.title}`); } else toast(`"${u.searchParams.get('t')}" isn't in your library yet`);
    } else if (kind === 'playlist') {
      const d = JSON.parse(b64d(u.searchParams.get('d')));
      makePlaylist(d.n || 'Shared playlist', (d.i || []).map(([title, artist]) => ({ title, artist })));
    } else if (kind === 'room') { go('rooms'); joinRoom(u.searchParams.get('c')); }
    else throw 0;
  } catch { toast('That smart link could not be opened'); }
}
window.sonoma.onOpenLink(openLink);

// ---------------- player ----------------
function playList(ids, start = 0) {
  if (!ids.length) return toast('Nothing to play');
  P.queue = ids.slice();
  if (P.shuffle) { const first = P.queue.splice(start, 1)[0]; P.queue.sort(() => Math.random() - 0.5); P.queue.unshift(first); start = 0; }
  P.index = start; loadCurrent(true);
}
function loadCurrent(autoplay, seekTo = 0) {
  const t = byId(P.queue[P.index]); if (!t) return;
  P.current = t;
  audio.src = window.sonoma.mediaUrl(t.path);
  if (seekTo) audio.addEventListener('loadedmetadata', () => { audio.currentTime = seekTo; }, { once: true });
  if (autoplay) audio.play().catch(() => toast('Could not play this file'));
  $('#nowTitle').textContent = t.title; $('#nowArtist').textContent = t.artist;
  $('#nowCover').outerHTML = coverHTML(t.cover).replace('class="cover ', 'id="nowCover" class="cover ');
  $('#bar').style.setProperty('--nc', t.cover ? `url('${t.cover}')` : 'none');
  syncFav();
  document.title = `${t.title} · ${t.artist} — Sonoma`;
  loadLyrics(t); renderQueue(); refreshPlaying(); updateTint(); roomPush();
}
function refreshPlaying() {
  if (['home', 'album', 'playlist', 'favorites', 'library', 'search'].includes(view)) {
    const st = $('#main').scrollTop;
    if (view === 'search' || document.activeElement?.id === 'hSearch') { /* keep inputs focused */
      const lw = $('#listWrap'); if (lw && view !== 'search') { const ev = new Event('input'); $('#hSearch').dispatchEvent(ev); }
      return;
    }
    render(); $('#main').scrollTop = st;
  }
}
function next(auto) {
  if (!P.queue.length) return;
  if (auto && P.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
  if (P.index < P.queue.length - 1) P.index++;
  else if (P.repeat === 'all' || !auto) P.index = 0;
  else { audio.pause(); return; }
  loadCurrent(true);
}
function prev() { if (audio.currentTime > 3 || P.index <= 0) { audio.currentTime = 0; return; } P.index--; loadCurrent(true); }
function syncFav() { const on = P.current && S.favorites.includes(P.current.id); $('#favBtn').classList.toggle('on', !!on); }
function toggleFav(id) {
  const i = S.favorites.indexOf(id);
  if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(id);
  save(); syncFav(); toast(i >= 0 ? 'Removed from favorites' : 'Added to favorites');
  if (view === 'favorites' || view === 'library') render();
}
function syncModeBtns() {
  $('#shufBtn').classList.toggle('on', P.shuffle);
  $('#repBtn').classList.toggle('on', P.repeat !== 'off');
  $('#repBtn').title = `Repeat: ${P.repeat}`;
  const one = $('#repBtn').querySelector('.one'); if (one) one.remove();
  if (P.repeat === 'one') $('#repBtn').insertAdjacentHTML('beforeend', '<b class="one">1</b>');
}
$('#playBtn').onclick = () => { if (!P.current) { if (S.library.length) playList(S.library.map(t => t.id)); return; } audio.paused ? audio.play() : audio.pause(); };
$('#nextBtn').onclick = () => next(false);
$('#prevBtn').onclick = prev;
$('#shufBtn').onclick = () => { P.shuffle = !P.shuffle; syncModeBtns(); };
$('#repBtn').onclick = () => { P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat]; syncModeBtns(); };
$('#favBtn').onclick = () => P.current && toggleFav(P.current.id);
$('#shareBtn').onclick = () => P.current ? copyLink(trackLink(P.current)) : toast('Nothing playing');
const vol = $('#vol');
let lastVol = 80;
vol.oninput = () => { audio.volume = vol.value / 100; S.settings.volume = +vol.value; setRange(vol); setIc($('#muteBtn'), +vol.value ? 'vol' : 'volx'); save(); };
$('#muteBtn').onclick = () => { if (+vol.value) { lastVol = +vol.value; vol.value = 0; } else vol.value = lastVol || 80; vol.oninput(); };
audio.onplay = () => { setIc($('#playBtn'), 'pause'); document.querySelectorAll('.tr.playing .num').forEach(n => n.classList.remove('paused')); roomPush(); };
audio.onpause = () => { setIc($('#playBtn'), 'play'); document.querySelectorAll('.tr.playing .num').forEach(n => n.classList.add('paused')); roomPush(); };
audio.onended = () => next(true);
audio.ontimeupdate = () => {
  if (!dragging && audio.duration) $('#progFill').style.width = (audio.currentTime / audio.duration * 100) + '%';
  $('#tCur').textContent = fmt(audio.currentTime); $('#tDur').textContent = fmt(audio.duration);
};
let dragging = false;
const prog = $('#prog');
function seekFromEvent(e) { const r = prog.getBoundingClientRect(); const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); $('#progFill').style.width = f * 100 + '%'; return f; }
prog.onmousedown = e => {
  if (!audio.duration) return; dragging = true; seekFromEvent(e);
  const mv = ev => seekFromEvent(ev);
  const up = ev => { dragging = false; audio.currentTime = seekFromEvent(ev) * audio.duration; roomPush(); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
};
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); $('#playBtn').click(); }
  if (e.code === 'ArrowRight' && e.ctrlKey) next(false);
  if (e.code === 'ArrowLeft' && e.ctrlKey) prev();
});

// ---------------- side panel: lyrics / queue ----------------
let panelTab = 'lyrics';
function openPanel(tab) {
  const panel = $('#panel'), isOpen = !panel.classList.contains('hidden');
  if (isOpen && panelTab === tab) { panel.classList.add('hidden'); }
  else { panel.classList.remove('hidden'); panelTab = tab; }
  const open = !panel.classList.contains('hidden');
  $('#content').classList.toggle('with-panel', open);
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === panelTab));
  $('#lyrBody').classList.toggle('hidden', panelTab !== 'lyrics');
  $('#queueBody').classList.toggle('hidden', panelTab !== 'queue');
  $('#lyrSrc').classList.toggle('hidden', panelTab !== 'lyrics');
  $('#lyrBtn').classList.toggle('on', open && panelTab === 'lyrics');
  $('#queueBtn').classList.toggle('on', open && panelTab === 'queue');
  lyrIdx = -1;
  if (panelTab === 'queue') renderQueue();
}
$('#lyrBtn').onclick = () => openPanel('lyrics');
$('#queueBtn').onclick = () => openPanel('queue');
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { if (panelTab !== b.dataset.tab) openPanel(b.dataset.tab); });
function renderQueue() {
  const box = $('#queueBody'); if (box.classList.contains('hidden')) return;
  if (!P.queue.length) { box.innerHTML = '<p class="empty">The queue is empty.</p>'; return; }
  const item = (id, i) => { const t = byId(id); if (!t) return ''; return `<div class="tr ${i === P.index ? 'playing' : ''}" data-q="${i}"><div class="ttl">${coverHTML(t.cover)}<div style="min-width:0"><div class="tt">${esc(t.title)}</div><span class="ta">${esc(t.artist)}</span></div></div><div class="d">${fmt(t.duration)}</div></div>`; };
  box.innerHTML = `<div class="qh">Now playing</div>${item(P.queue[P.index], P.index)}<div class="qh">Up next · ${Math.max(0, P.queue.length - P.index - 1)}</div>${P.queue.slice(P.index + 1).map((id, k) => item(id, P.index + 1 + k)).join('')}`;
  box.querySelectorAll('[data-q]').forEach(el => {
    el.ondblclick = () => { P.index = +el.dataset.q; loadCurrent(true); };
    el.oncontextmenu = e => { e.preventDefault(); const i = +el.dataset.q; if (i === P.index) return; showMenu(e.clientX, e.clientY, [{ icon: 'trash', text: 'Remove from queue', action: () => { P.queue.splice(i, 1); renderQueue(); } }]); };
  });
}

let LY = { type: 'none', lines: [] }, lyrIdx = -1, lyrFor = null;
async function loadLyrics(t) {
  lyrFor = t.id; lyrIdx = -1;
  const body = $('#lyrBody');
  body.classList.remove('plain'); body.innerHTML = '<p class="empty">Looking for lyrics…</p>'; $('#lyrSrc').textContent = '';
  const r = await Lyrics.getLyrics(t);
  if (lyrFor !== t.id) return;
  LY = r; $('#lyrSrc').textContent = r.source;
  if (r.type === 'none') { body.innerHTML = `<p class="empty">No lyrics found for this song.<br><br>Tip: put a <b>.lrc</b> file with the same name next to the audio file.</p>`; return; }
  if (r.type === 'plain') { body.classList.add('plain'); body.innerHTML = r.lines.map(l => `<p>${esc(l.text) || '&nbsp;'}</p>`).join(''); body.scrollTop = 0; return; }
  body.innerHTML = r.lines.map((l, i) => `<p data-i="${i}">${l.text ? l.words.map(w => `<span class="w">${esc(w.text)}</span>`).join(' ') : '♪'}</p>`).join('');
  body.querySelectorAll('p').forEach(p => p.onclick = () => { audio.currentTime = LY.lines[+p.dataset.i].time; if (audio.paused) audio.play(); roomPush(); });
}
function tickLyrics() {
  requestAnimationFrame(tickLyrics);
  if (LY.type !== 'synced' || $('#lyrBody').classList.contains('hidden') || $('#panel').classList.contains('hidden')) return;
  const t = audio.currentTime + 0.15;
  let i = -1;
  for (let k = 0; k < LY.lines.length; k++) { if (LY.lines[k].time <= t) i = k; else break; }
  const ps = $('#lyrBody').children;
  if (i !== lyrIdx) {
    for (let k = 0; k < ps.length; k++) ps[k].classList.toggle('cur', k === i);
    if (ps[i]) ps[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
    lyrIdx = i;
  }
  const line = LY.lines[i], p = ps[i];
  if (line && p && line.words) { const sp = p.children; for (let k = 0; k < sp.length; k++) sp[k].classList.toggle('lit', line.words[k] && line.words[k].time <= t); }
}
requestAnimationFrame(tickLyrics);

// ---------------- listening rooms ----------------
const R = { ws: null, code: null, host: false, members: [], log: [], offset: 0, remoteTrack: null, applying: false };
function roomSend(msg) { if (R.ws?.readyState === 1) R.ws.send(JSON.stringify(msg)); }
function roomPush() {
  if (!R.host || !R.code || R.applying) return;
  const t = P.current;
  roomSend({ type: 'state', track: t ? { title: t.title, artist: t.artist, duration: t.duration } : null, playing: !audio.paused, position: audio.currentTime });
}
setInterval(() => { if (R.host && !audio.paused) roomPush(); if (R.code) roomSend({ type: 'ping', t: Date.now() }); }, 5000);
function joinRoom(code) {
  code = (code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!code) return toast('Enter a room code');
  leaveRoom(true);
  let ws;
  try { ws = new WebSocket(S.settings.roomServer); } catch { return toast('Invalid room server address'); }
  R.ws = ws; R.log = [{ sys: `Connecting to ${S.settings.roomServer}…` }];
  ws.onopen = () => { ws.send(JSON.stringify({ type: 'join', room: code, profile: S.profile })); ws.send(JSON.stringify({ type: 'ping', t: Date.now() })); };
  ws.onerror = () => toast('Could not reach the room server');
  ws.onclose = () => { if (R.ws === ws) { R.ws = null; R.code = null; R.host = false; R.members = []; $('#roomDot').classList.add('hidden'); if (view === 'rooms') render(); } };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === 'pong') { R.offset = m.serverTime - (m.t + Date.now()) / 2; return; }
    if (m.type === 'error') { toast(m.message); return; }
    if (m.type === 'joined') { R.code = m.room; R.host = m.host; R.log.push({ sys: `Joined room ${m.room}${m.host ? ' as host' : ''}` }); $('#roomDot').classList.remove('hidden'); if (m.host) roomPush(); else applyRemote(m.state); }
    if (m.type === 'members') R.members = m.members;
    if (m.type === 'promoted') { R.host = true; R.log.push({ sys: 'You are now the host' }); roomPush(); }
    if (m.type === 'chat') { R.log.push({ from: m.from, text: m.text }); if (view !== 'rooms') toast(`${m.from.name}: ${m.text}`); }
    if (m.type === 'state' && !R.host) applyRemote(m.state);
    if (view === 'rooms') vRoomsUpdate();
  };
  render();
}
function leaveRoom(silent) {
  if (R.ws) { const ws = R.ws; R.ws = null; ws.close(); }
  R.code = null; R.host = false; R.members = []; R.remoteTrack = null;
  $('#roomDot').classList.add('hidden');
  if (!silent) render();
}
function applyRemote(st) {
  if (!st || !st.track) { R.remoteTrack = null; return; }
  R.remoteTrack = st.track;
  const t = matchTrack(st.track.title, st.track.artist);
  if (!t) { R.missing = true; return; }
  R.missing = false;
  const expected = st.position + (st.playing ? (Date.now() + R.offset - st.updatedAt) / 1000 : 0);
  R.applying = true;
  if (P.current?.id !== t.id) { P.queue = [t.id]; P.index = 0; loadCurrent(st.playing, expected); }
  else {
    if (Math.abs(audio.currentTime - expected) > 0.6) audio.currentTime = expected;
    if (st.playing && audio.paused) audio.play().catch(() => {});
    if (!st.playing && !audio.paused) audio.pause();
  }
  setTimeout(() => { R.applying = false; }, 300);
}
function vRooms(main) {
  if (!R.ws) {
    main.innerHTML = `<div class="ph"><h1>Listening rooms</h1><span class="sub">Listen together in sync. Everyone needs the same songs in their library.</span></div>
    <div class="cards">
      <div class="card"><h3>Start a room</h3><p>You'll be the host: whatever you play, the room hears.</p><button class="btn light" id="rNew">${ic('users')} Create room</button></div>
      <div class="card"><h3>Join a room</h3><p>Got a code from a friend?</p><div class="row"><input id="rCode" placeholder="e.g. SUN-42" maxlength="16"><button class="btn light" id="rJoin">Join</button></div></div>
    </div>
    <p class="sub" style="margin-top:18px;color:var(--muted)">Server: ${esc(S.settings.roomServer)} · change it in Settings. Run your own with <b>npm run server</b>.</p>`;
    const words = ['SUN', 'VINE', 'FOG', 'GOLD', 'HILL', 'OAK', 'BAY'];
    $('#rNew').onclick = () => joinRoom(`${words[Math.floor(Math.random() * words.length)]}-${Math.floor(10 + Math.random() * 90)}`);
    $('#rJoin').onclick = () => joinRoom($('#rCode').value);
    $('#rCode').onkeydown = e => e.key === 'Enter' && joinRoom($('#rCode').value);
    return;
  }
  main.innerHTML = `<div class="ph"><div><div class="sub" style="color:var(--muted)">Room code</div><div class="code">${esc(R.code || '…')}</div></div><span class="grow"></span>
    <span id="rNow" style="color:var(--muted)"></span>
    <button class="btn" id="rCopy">${ic('link')} Invite link</button><button class="btn danger" id="rLeave">Leave</button></div>
    <div class="room-grid"><div class="card chat"><div class="chat-log" id="rLog"></div><form id="rForm"><input id="rMsg" placeholder="Say something…" autocomplete="off"><button class="btn light">Send</button></form></div>
    <div class="card"><h3>In the room</h3><div id="rMem"></div></div></div>`;
  $('#rLeave').onclick = () => leaveRoom();
  $('#rCopy').onclick = () => copyLink(`sonoma://room?c=${R.code}`);
  $('#rForm').onsubmit = e => { e.preventDefault(); const v = $('#rMsg').value.trim(); if (!v) return; roomSend({ type: 'chat', text: v }); $('#rMsg').value = ''; };
  vRoomsUpdate();
}
function vRoomsUpdate() {
  const log = $('#rLog'); if (!log) return render();
  const code = document.querySelector('.code'); if (code) code.textContent = R.code || '…';
  log.innerHTML = R.log.map(m => m.sys ? `<div class="msg sys">${esc(m.sys)}</div>` : `<div class="msg"><em style="color:${esc(m.from.color)}">${esc(m.from.avatar)} ${esc(m.from.name)}</em>${esc(m.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
  $('#rMem').innerHTML = R.members.map(m => `<div class="mem"><span class="av" style="background:${esc(m.profile.color)}">${esc(m.profile.avatar)}</span><div>${esc(m.profile.name)}${m.host ? '<br><small>★ HOST</small>' : ''}</div></div>`).join('');
  const now = $('#rNow');
  if (now) now.textContent = R.host ? 'You are hosting — play anything' : R.remoteTrack ? `${R.missing ? '⚠ Missing: ' : '♪ '}${R.remoteTrack.title} · ${R.remoteTrack.artist}` : 'Waiting for the host…';
}

// ---------------- profile & settings ----------------
const COLORS = ['#3d85c6', '#5fb0ff', '#7a5cff', '#c9407a', '#e0623a', '#e8a33d', '#45a07a', '#6aa84f'];
const AVATARS = ['🎧', '🎸', '🎹', '🎷', '🥁', '🎤', '🌻', '🌙', '🔥', '🌊', '🍷', '🦊'];
function vProfile(main) {
  const pr = S.profile;
  main.innerHTML = `<div class="pcard"><span class="av" style="background:${esc(pr.color)}">${esc(pr.avatar)}</span><div><h1>${esc(pr.name)}</h1><p>${esc(pr.bio) || 'No bio yet'}</p></div></div>
  <div class="cards"><div class="card">
    <div class="field"><label>Display name</label><input id="pName" maxlength="32" value="${esc(pr.name)}"></div>
    <div class="field"><label>Bio</label><input id="pBio" maxlength="120" value="${esc(pr.bio)}" placeholder="What are you listening to lately?"></div>
  </div><div class="card">
    <div class="field"><label>Avatar</label><div class="emojis">${AVATARS.map(a => `<button data-a="${a}" class="${a === pr.avatar ? 'on' : ''}">${a}</button>`).join('')}</div></div>
    <div class="field"><label>Profile colour</label><div class="swatches">${COLORS.map(c => `<button data-c="${c}" style="background:${c}" class="${c === pr.color ? 'on' : ''}"></button>`).join('')}</div></div>
    <p>Your name, avatar and colour show up in listening rooms.</p>
  </div></div>`;
  const upd = () => { save(); render(); };
  $('#pName').onchange = e => { pr.name = e.target.value.trim() || 'Listener'; upd(); };
  $('#pBio').onchange = e => { pr.bio = e.target.value.trim(); upd(); };
  main.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { pr.avatar = b.dataset.a; upd(); });
  main.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { pr.color = b.dataset.c; upd(); });
}
function vSettings(main) {
  const st = S.settings;
  main.innerHTML = `<div class="ph"><h1>Settings</h1></div><div class="cards">
    <div class="card"><h3>Profile</h3><p>${esc(S.profile.avatar)} ${esc(S.profile.name)} · name, avatar and colour shown in rooms.</p><button class="btn" id="sProfile">${ic('edit')} Edit profile</button></div>
    <div class="card"><h3>Listening rooms</h3><div class="field"><label>Room server</label><input id="sRoom" value="${esc(st.roomServer)}"></div><p>Start a server with <b>npm run server</b>, or point this to a friend's.</p></div>
    <div class="card"><h3>Spotify import</h3><p>Create a free app at developer.spotify.com and paste its keys. They stay on this computer.</p>
      <div class="field"><label>Client ID</label><input id="sSpId" value="${esc(st.spotifyId)}"></div>
      <div class="field"><label>Client secret</label><input id="sSpSec" type="password" value="${esc(st.spotifySecret)}"></div></div>
    <div class="card"><h3>Privacy</h3><p>Sonoma sends nothing about you anywhere. Lyrics are looked up on lrclib.net by song title and artist.</p>
      <label class="row"><input type="checkbox" id="sTel" ${st.telemetry ? 'checked' : ''}> Share anonymous crash reports (opt-in)</label></div>
    <div class="card"><h3>Library</h3><p>${S.library.length} tracks · ${albums().length} albums · ${S.playlists.length} playlists</p><div class="row"><button class="btn" id="sAdd">${ic('folder')} Add folder</button><button class="btn danger" id="sClear">Clear library</button></div></div>
  </div>`;
  $('#sRoom').onchange = e => { st.roomServer = e.target.value.trim(); save(); toast('Saved'); };
  $('#sSpId').onchange = e => { st.spotifyId = e.target.value.trim(); save(); toast('Saved'); };
  $('#sSpSec').onchange = e => { st.spotifySecret = e.target.value.trim(); save(); toast('Saved'); };
  $('#sTel').onchange = e => { st.telemetry = e.target.checked; save(); };
  $('#sAdd').onclick = addFolder;
  $('#sProfile').onclick = () => go('profile');
  $('#sClear').onclick = async () => { if (await confirmBox('Remove all tracks from the library? Your files stay on disk.')) { S.library = []; S.favorites = []; S.playlists.forEach(p => p.items.forEach(i => i.trackId = null)); libraryChanged(); render(); } };
}

// ---------------- boot ----------------
(async () => {
  hydrateIcons();
  const stored = await window.sonoma.getStore();
  S = { ...DEFAULTS, ...stored, profile: { ...DEFAULTS.profile, ...stored.profile }, settings: { ...DEFAULTS.settings, ...stored.settings } };
  vol.value = S.settings.volume; audio.volume = vol.value / 100; setRange(vol);
  render();
})();
