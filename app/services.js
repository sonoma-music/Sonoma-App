// Sonoma main-process services: link resolving, legal download sources, download queue,
// metadata (MusicBrainz / Cover Art Archive / LRCLIB), tag writing, CD ripping and watch folders.
const { net } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const crypto = require('crypto');

const UA = 'Sonoma/0.1.0 ( https://trysonoma.xyz )';
const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.opus', '.aac', '.webm']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Unknown';
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/feat\..*$/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function getJSON(url, opts = {}) {
  const res = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) } });
  if (res.status === 429) { const e = new Error('Rate limited, try again in a minute'); e.code = 429; throw e; }
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.json();
}
async function getBuffer(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------- link resolving (Odesli)
const STORES = [
  { id: 'qobuz', name: 'Qobuz Store', note: 'Hi-res FLAC', url: q => `https://www.qobuz.com/us-en/search?q=${encodeURIComponent(q)}` },
  { id: 'bandcamp', name: 'Bandcamp', note: 'FLAC, artist-friendly', url: q => `https://bandcamp.com/search?q=${encodeURIComponent(q)}` },
  { id: '7digital', name: '7digital', note: 'FLAC / MP3', url: q => `https://us.7digital.com/search?q=${encodeURIComponent(q)}` },
  { id: 'hdtracks', name: 'HDtracks', note: 'Hi-res FLAC', url: q => `https://www.hdtracks.com/#/search?q=${encodeURIComponent(q)}` }
];
const buyLinks = (title, artist) => STORES.map(s => ({ id: s.id, name: s.name, note: s.note, url: s.url(`${artist} ${title}`.trim()) }));

const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function pageMeta(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sonoma/0.1; +https://trysonoma.xyz)', 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`That page answered ${res.status}`);
  const html = (await res.text()).slice(0, 400_000);
  const og = {};
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) if (!(m[1] in og)) og[m[1]] = decode(m[2]);
  return og;
}
const elsewhere = (title, artist) => {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return [
    { platform: 'spotify', url: `https://open.spotify.com/search/${q}` },
    { platform: 'appleMusic', url: `https://music.apple.com/us/search?term=${q}` },
    { platform: 'youtubeMusic', url: `https://music.youtube.com/search?q=${q}` },
    { platform: 'deezer', url: `https://www.deezer.com/search/${q}` },
    { platform: 'tidal', url: `https://listen.tidal.com/search?q=${q}` },
    { platform: 'soundcloud', url: `https://soundcloud.com/search?q=${q}` }
  ];
};

// Turns a song/album link from a streaming service into { kind, title, artist, album, cover }.
async function identify(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) {
    const d = await getJSON(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    let artist = (d.author_name || '').replace(/ - Topic$/, '').replace(/VEVO$/i, ''), title = d.title || '';
    const m = title.match(/^(.+?)\s+[-–]\s+(.+)$/);
    if (m && !/ - Topic$/.test(d.author_name)) { artist = m[1]; title = m[2]; }
    return { kind: 'song', title: title.replace(/\s*[([](official|lyric|audio|video|visualizer|hd|4k)[^)\]]*[)\]]/gi, '').trim(), artist, cover: d.thumbnail_url };
  }
  if (/soundcloud\.com$/.test(host)) {
    const d = await getJSON(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    const m = (d.title || '').match(/^(.+) by (.+)$/);
    return { kind: 'song', title: m ? m[1] : d.title, artist: m ? m[2] : d.author_name, cover: d.thumbnail_url };
  }
  if (/deezer\.com$/.test(host) || host === 'deezer.page.link') {
    const m = u.pathname.match(/(track|album)\/(\d+)/);
    if (m) {
      const d = await getJSON(`https://api.deezer.com/${m[1]}/${m[2]}`);
      if (d.error) throw new Error('Deezer could not find that link');
      return { kind: m[1] === 'track' ? 'song' : 'album', title: d.title, artist: d.artist?.name, album: d.album?.title, cover: d.album?.cover_xl || d.cover_xl, isrc: d.isrc };
    }
  }
  if (/music\.apple\.com$|itunes\.apple\.com$/.test(host)) {
    const id = u.searchParams.get('i') || (u.pathname.match(/\/(\d+)(?:$|\?)/) || [])[1];
    if (id) {
      const d = await getJSON(`https://itunes.apple.com/lookup?id=${id}`);
      const r = d.results?.[0];
      if (r) return { kind: r.wrapperType === 'track' ? 'song' : 'album', title: r.trackName || r.collectionName, artist: r.artistName, album: r.collectionName, cover: (r.artworkUrl100 || '').replace('100x100', '600x600') };
    }
  }
  // Spotify, Tidal, Amazon, Bandcamp and anything else: read the page's Open Graph tags.
  const og = await pageMeta(url);
  let title = og['og:title'] || '', artist = '', album = '', kind = /album/.test(og['og:type'] || u.pathname) ? 'album' : 'song';
  const desc = og['og:description'] || '';
  if (/spotify\.com$/.test(host)) { const p = desc.split(' · '); artist = p[0] || ''; if (kind === 'song') album = p[1] || ''; }
  else if (/tidal\.com$/.test(host)) { const m = title.match(/^(.+?) - (.+)$/) ; if (m) { artist = m[1]; title = m[2]; } }
  else if (/bandcamp\.com$/.test(host)) { const m = title.match(/^(.+?), by (.+)$/); if (m) { title = m[1]; artist = m[2]; } }
  else { const m = title.match(/^(.+?)\s+(?:-|by)\s+(.+?)(?:\s+[|-].*)?$/); if (m) { title = m[1]; artist = m[2]; } }
  if (!title) throw new Error('Could not read a song or album from that link');
  return { kind, title, artist, album, cover: og['og:image'] || null };
}

async function resolveLink(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Paste a full link starting with https://');
  const d = await identify(url.trim());
  return { ...d, links: elsewhere(d.title, d.artist), buy: buyLinks(d.title, d.artist) };
}

// ---------------------------------------------------------------- legal sources ("extensions")
// Each provider: search(q, cfg) -> [{ key, kind:'track'|'album', title, artist, album, cover, license, duration }]
//                tracks(item, cfg) -> [{ title, artist, album, trackNo, year, cover, url, ext, license, source }]
const providers = {
  archive: {
    id: 'archive', name: 'Internet Archive', needsKey: false,
    description: 'Live concerts (etree, artist-approved taping), public-domain and Creative Commons audio. Many items in FLAC.',
    async search(q) {
      const qs = `(${q}) AND mediatype:(etree OR audio) AND -collection:(librivoxaudio)`;
      const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(qs)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=licenseurl&rows=24&output=json&sort[]=downloads+desc`;
      const d = await getJSON(u);
      return (d.response?.docs || []).map(x => ({
        key: x.identifier, kind: 'album', title: Array.isArray(x.title) ? x.title[0] : x.title,
        artist: Array.isArray(x.creator) ? x.creator[0] : (x.creator || ''), year: x.year || null,
        cover: `https://archive.org/services/img/${x.identifier}`, license: x.licenseurl || 'See item page',
        page: `https://archive.org/details/${x.identifier}`
      }));
    },
    async tracks(item) {
      const d = await getJSON(`https://archive.org/metadata/${encodeURIComponent(item.key)}`);
      const md = d.metadata || {};
      const files = d.files || [];
      const pick = fmt => files.filter(f => f.source === 'original' || /flac|mp3/i.test(f.format)).filter(f => fmt.test(f.format || ''));
      let chosen = pick(/^(24bit )?flac$/i);
      if (!chosen.length) chosen = pick(/^vbr mp3$|^mp3$|^128kbps mp3$/i);
      if (!chosen.length) chosen = pick(/ogg vorbis/i);
      const one = v => Array.isArray(v) ? v[0] : v;
      const album = one(md.title) || item.title;
      const artist = one(md.creator) || item.artist || 'Unknown artist';
      const year = parseInt(one(md.date) || one(md.year), 10) || null;
      return chosen
        .map((f, i) => ({
          title: f.title || path.basename(f.name, path.extname(f.name)).replace(/^\d+[\s._-]+/, ''),
          artist: f.creator || artist, album: f.album || album,
          trackNo: parseInt(f.track, 10) || i + 1, year,
          cover: `https://archive.org/services/img/${item.key}`,
          url: `https://archive.org/download/${encodeURIComponent(item.key)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
          ext: path.extname(f.name).toLowerCase() || '.flac',
          license: one(md.licenseurl) || 'See https://archive.org/details/' + item.key, source: 'archive'
        }))
        .sort((a, b) => a.trackNo - b.trackNo);
    }
  },
  jamendo: {
    id: 'jamendo', name: 'Jamendo', needsKey: true, keyLabel: 'Jamendo client ID',
    keyHelp: 'Free at devportal.jamendo.com. Every track is Creative Commons licensed and free to download.',
    description: 'Independent artists publishing under Creative Commons. Downloads in FLAC or MP3.',
    async search(q, cfg) {
      if (!cfg.jamendoId) throw new Error('Add your Jamendo client ID under Sources');
      const base = `https://api.jamendo.com/v3.0`;
      const [tr, al] = await Promise.all([
        getJSON(`${base}/tracks/?client_id=${cfg.jamendoId}&format=json&limit=15&search=${encodeURIComponent(q)}&audiodlformat=flac`),
        getJSON(`${base}/albums/?client_id=${cfg.jamendoId}&format=json&limit=9&namesearch=${encodeURIComponent(q)}`)
      ]);
      if (tr.headers?.status === 'failed') throw new Error(`Jamendo: ${tr.headers.error_message}`);
      return [
        ...(al.results || []).map(a => ({ key: 'a' + a.id, kind: 'album', title: a.name, artist: a.artist_name, cover: a.image, year: parseInt(a.releasedate, 10) || null, license: 'Creative Commons', page: a.shareurl })),
        ...(tr.results || []).filter(t => t.audiodownload_allowed).map(t => ({ key: 't' + t.id, kind: 'track', title: t.name, artist: t.artist_name, album: t.album_name, cover: t.album_image, duration: t.duration, license: t.license_ccurl, page: t.shareurl }))
      ];
    },
    async tracks(item, cfg) {
      const base = `https://api.jamendo.com/v3.0`;
      const id = item.key.slice(1);
      const url = item.key[0] === 'a'
        ? `${base}/tracks/?client_id=${cfg.jamendoId}&format=json&limit=100&album_id=${id}&audiodlformat=flac&order=position`
        : `${base}/tracks/?client_id=${cfg.jamendoId}&format=json&id=${id}&audiodlformat=flac`;
      const d = await getJSON(url);
      return (d.results || []).filter(t => t.audiodownload_allowed && t.audiodownload).map(t => ({
        title: t.name, artist: t.artist_name, album: t.album_name, trackNo: parseInt(t.position, 10) || null,
        year: parseInt(t.releasedate, 10) || null, cover: t.album_image, url: t.audiodownload,
        ext: /flac/i.test(t.audiodownload) ? '.flac' : '.mp3', license: t.license_ccurl, source: 'jamendo'
      }));
    }
  }
};
const providerList = () => Object.values(providers).map(p => ({ id: p.id, name: p.name, description: p.description, needsKey: p.needsKey, keyLabel: p.keyLabel, keyHelp: p.keyHelp }));

async function searchSources(q, cfg) {
  const enabled = (cfg.sources || ['archive']).filter(id => providers[id]);
  const out = await Promise.all(enabled.map(async id => {
    try { return { id, name: providers[id].name, items: await providers[id].search(q, cfg) }; }
    catch (e) { return { id, name: providers[id].name, items: [], error: e.message }; }
  }));
  return out;
}
const sourceTracks = (id, item, cfg) => providers[id].tracks(item, cfg);

// Looks for a free, legal copy of one song across enabled sources.
async function findFree(title, artist, cfg) {
  const enabled = (cfg.sources || ['archive']).filter(id => providers[id]);
  for (const id of enabled) {
    try {
      const items = await providers[id].search(`${artist} ${title}`, cfg);
      const nt = norm(title), na = norm(artist);
      const byArtist = i => !na || norm(i.artist).includes(na.split(' ')[0]);
      // exact song first, then a release (e.g. an Archive item) named after the song
      const hit = items.find(i => i.kind === 'track' && norm(i.title) === nt && byArtist(i))
        || items.find(i => i.kind === 'album' && norm(i.title).includes(nt) && byArtist(i));
      if (hit) return { source: id, sourceName: providers[id].name, item: hit };
    } catch { /* try next source */ }
  }
  return null;
}

// ---------------------------------------------------------------- metadata
let mbLast = 0;
async function mb(pathAndQuery) { // MusicBrainz asks for at most one request per second
  const wait = mbLast + 1100 - Date.now(); if (wait > 0) await sleep(wait);
  mbLast = Date.now();
  const url = `https://musicbrainz.org/ws/2/${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}fmt=json`;
  for (let i = 0; ; i++) {
    try { return await getJSON(url); }
    catch (e) { if (i >= 3 || !/503|429|busy|Rate/i.test(e.message)) throw e; await sleep(1500 * (i + 1)); mbLast = Date.now(); }
  }
}
const q = s => `"${String(s).replace(/["\\]/g, ' ')}"`;
async function metaLookup({ title, artist, album, duration }) {
  let query = `recording:${q(title)}`;
  if (artist) query += ` AND artist:${q(artist)}`;
  if (album) query += ` AND release:${q(album)}`;
  let d = await mb(`recording?query=${encodeURIComponent(query)}&limit=8`);
  if (!d.recordings?.length && album) d = await mb(`recording?query=${encodeURIComponent(`recording:${q(title)}${artist ? ` AND artist:${q(artist)}` : ''}`)}&limit=8`);
  const out = [];
  for (const r of d.recordings || []) {
    // prefer the earliest official release (usually the original album over later reissues)
    const rels = (r.releases || []).slice().sort((a, b) => (a.status === 'Official' ? 0 : 1) - (b.status === 'Official' ? 0 : 1) || String(a.date || '9999').localeCompare(String(b.date || '9999')));
    const rel = (album && rels.find(x => norm(x.title) === norm(album))) || rels[0];
    if (!rel) continue;
    const med = rel.media?.[0];
    const lenOk = !duration || !r.length || Math.abs(r.length / 1000 - duration) < 8;
    out.push({
      recordingId: r.id, releaseId: rel.id, score: r.score + (lenOk ? 0 : -30),
      title: r.title, artist: (r['artist-credit'] || []).map(a => a.name + (a.joinphrase || '')).join('') || artist,
      album: rel.title, albumArtist: (rel['artist-credit'] || r['artist-credit'] || []).map(a => a.name + (a.joinphrase || '')).join(''),
      year: parseInt(rel.date, 10) || null, trackNo: parseInt(med?.track?.[0]?.number, 10) || null,
      trackCount: rel['track-count'] || med?.['track-count'] || null, discNo: med?.position || null,
      genre: (r.tags || []).sort((a, b) => b.count - a.count)[0]?.name || null, length: r.length ? r.length / 1000 : null
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6);
}
async function coverFor(releaseId) {
  try { return await getBuffer(`https://coverartarchive.org/release/${releaseId}/front-500`); } catch { return null; }
}
async function lyricsFor({ title, artist, album, duration }) {
  const p = new URLSearchParams({ track_name: title, artist_name: artist || '' });
  if (album) p.set('album_name', album);
  if (duration) p.set('duration', Math.round(duration));
  try { const d = await getJSON(`https://lrclib.net/api/get?${p}`); return { synced: d.syncedLyrics || null, plain: d.plainLyrics || null }; }
  catch { return { synced: null, plain: null }; }
}

// Writes tags (+ cover, lyrics) into the audio file and a .lrc next to it.
async function writeTags(file, meta, { cover, lyrics } = {}) {
  const { File, Picture, ByteVector, PictureType } = require('node-taglib-sharp');
  const f = File.createFromPath(file);
  try {
    const t = f.tag;
    if (meta.title) t.title = meta.title;
    if (meta.artist) t.performers = [meta.artist];
    if (meta.albumArtist || meta.artist) t.albumArtists = [meta.albumArtist || meta.artist];
    if (meta.album) t.album = meta.album;
    if (meta.year) t.year = meta.year;
    if (meta.trackNo) t.track = meta.trackNo;
    if (meta.trackCount) t.trackCount = meta.trackCount;
    if (meta.discNo) t.disc = meta.discNo;
    if (meta.genre) t.genres = [meta.genre];
    if (meta.license) t.copyright = meta.license;
    if (meta.recordingId) t.musicBrainzTrackId = meta.recordingId;
    if (meta.releaseId) t.musicBrainzReleaseId = meta.releaseId;
    if (cover?.length) {
      const pic = Picture.fromData(ByteVector.fromByteArray(new Uint8Array(cover)));
      pic.type = PictureType.FrontCover;
      t.pictures = [pic];
    }
    if (lyrics?.plain || lyrics?.synced) t.lyrics = lyrics.plain || lyrics.synced.replace(/\[[\d:.]+\]\s?/g, '');
    f.save();
  } finally { f.dispose(); }
  if (lyrics?.synced) fs.writeFileSync(file.replace(/\.[^.\\/]+$/, '.lrc'), lyrics.synced);
}

// Full "fix metadata" for one library file: best MusicBrainz match unless one is given.
async function metaApply(file, candidate, base) {
  const m = candidate || (await metaLookup(base))[0];
  if (!m) throw new Error('No match on MusicBrainz');
  const cover = m.releaseId ? await coverFor(m.releaseId) : null;
  const lyrics = await lyricsFor({ title: m.title, artist: m.artist, album: m.album, duration: m.length || base.duration });
  await writeTags(file, m, { cover, lyrics });
  return m;
}

// ---------------------------------------------------------------- download queue
function createQueue({ readTags, onUpdate, onAdded, getCfg }) {
  const jobs = [];
  let active = 0, pausedUntil = 0;
  const pub = j => onUpdate({ id: j.id, title: j.title, artist: j.artist, album: j.album, status: j.status, progress: j.progress, error: j.error || null, source: j.source });
  const list = () => jobs.map(j => ({ id: j.id, title: j.title, artist: j.artist, album: j.album, status: j.status, progress: j.progress, error: j.error || null, source: j.source }));

  async function run(j) {
    const cfg = getCfg();
    const root = cfg.downloadDir;
    if (!root) { j.status = 'error'; j.error = 'Choose a download folder in Settings'; return pub(j); }
    const dir = path.join(root, clean(j.albumArtist || j.artist), clean(j.album || 'Singles'));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${j.trackNo ? String(j.trackNo).padStart(2, '0') + ' ' : ''}${clean(j.title)}${j.ext || '.flac'}`);
    j.status = 'downloading'; j.progress = 0; pub(j);
    const res = await net.fetch(j.url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) { pausedUntil = Date.now() + 60_000; const e = new Error('Source is rate limiting, waiting a minute'); e.retry = true; throw e; }
    if (!res.ok) throw new Error(`Source answered ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const tmp = file + '.part';
    const out = fs.createWriteStream(tmp);
    let got = 0, lastPub = 0;
    const reader = res.body.getReader();
    for (;;) {
      if (j.cancel) { reader.cancel(); out.destroy(); fs.rmSync(tmp, { force: true }); j.status = 'cancelled'; return pub(j); }
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (!out.write(Buffer.from(value))) await new Promise(r => out.once('drain', r));
      if (total && Date.now() - lastPub > 250) { j.progress = got / total; lastPub = Date.now(); pub(j); }
    }
    await new Promise((r, x) => out.end(e => (e ? x(e) : r())));
    fs.renameSync(tmp, file);
    j.status = 'tagging'; j.progress = 1; pub(j);
    let cover = null;
    if (j.cover) { try { cover = await getBuffer(j.cover); } catch { /* keep going without art */ } }
    const lyrics = await lyricsFor({ title: j.title, artist: j.artist, album: j.album });
    try { await writeTags(file, j, { cover, lyrics }); } catch (e) { j.warn = 'Saved, but tags could not be written: ' + e.message; }
    onAdded(await readTags(file));
    j.status = 'done'; pub(j);
  }
  async function pump() {
    const max = Math.max(1, Math.min(4, getCfg().concurrency || 2));
    while (active < max) {
      if (Date.now() < pausedUntil) { setTimeout(pump, pausedUntil - Date.now() + 50); return; }
      const j = jobs.find(x => x.status === 'queued'); if (!j) return;
      active++;
      run(j).catch(e => { if (e.retry && (j.tries = (j.tries || 0) + 1) < 4) { j.status = 'queued'; j.error = e.message; } else { j.status = 'error'; j.error = e.message; } pub(j); })
        .finally(() => { active--; pump(); });
    }
  }
  return {
    add(tracks) {
      for (const t of tracks) {
        if (!/^https:\/\//.test(t.url || '')) continue;
        const j = { ...t, id: crypto.randomUUID(), status: 'queued', progress: 0 };
        jobs.push(j); pub(j);
      }
      pump(); return list();
    },
    cancel(id) { const j = jobs.find(x => x.id === id); if (!j) return; if (j.status === 'queued') { j.status = 'cancelled'; pub(j); } else j.cancel = true; },
    retry(id) { const j = jobs.find(x => x.id === id); if (j && /error|cancelled/.test(j.status)) { j.status = 'queued'; j.error = null; j.cancel = false; pub(j); pump(); } },
    clear() { for (let i = jobs.length - 1; i >= 0; i--) if (/done|cancelled|error/.test(jobs[i].status)) jobs.splice(i, 1); return list(); },
    list
  };
}

// ---------------------------------------------------------------- CD ripping (cdparanoia + flac)
const which = cmd => new Promise(r => execFile(process.platform === 'win32' ? 'where' : 'which', [cmd], e => r(!e)));
async function cdStatus() {
  if (process.platform !== 'linux') return { supported: false, reason: 'CD ripping uses cdparanoia and flac, which run on Linux. On Windows or macOS, rip with a free tool such as Exact Audio Copy or fre:ac into a watch folder and Sonoma picks the files up automatically.' };
  const [cdp, flac] = await Promise.all([which('cdparanoia'), which('flac')]);
  if (!cdp || !flac) return { supported: false, reason: `Install ${[!cdp && 'cdparanoia', !flac && 'flac'].filter(Boolean).join(' and ')} first, e.g. sudo apt install cdparanoia flac` };
  return { supported: true };
}
function cdToc() {
  return new Promise((resolve, reject) => {
    execFile('cdparanoia', ['-Q'], (err, stdout, stderr) => {
      const rows = [...String(stderr + stdout).matchAll(/^\s*(\d+)\.\s+(\d+)\s+\[[^\]]*\]\s+(\d+)\s+\[/gm)].map(m => ({ n: +m[1], len: +m[2], start: +m[3] }));
      if (!rows.length) return reject(new Error('No audio CD found in the drive'));
      resolve(rows);
    });
  });
}
function discId(rows) { // MusicBrainz disc ID from the table of contents
  const first = rows[0].n, last = rows[rows.length - 1].n;
  const lead = rows[rows.length - 1].start + rows[rows.length - 1].len + 150;
  let s = first.toString(16).toUpperCase().padStart(2, '0') + last.toString(16).toUpperCase().padStart(2, '0') + lead.toString(16).toUpperCase().padStart(8, '0');
  for (let i = 1; i <= 99; i++) { const r = rows.find(x => x.n === i); s += (r ? r.start + 150 : 0).toString(16).toUpperCase().padStart(8, '0'); }
  return crypto.createHash('sha1').update(s, 'ascii').digest('base64').replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');
}
async function cdInfo() {
  const st = await cdStatus(); if (!st.supported) return st;
  const rows = await cdToc();
  const id = discId(rows);
  let rel = null;
  try {
    const d = await mb(`discid/${id}?inc=recordings+artist-credits`);
    const r = d.releases?.[0];
    if (r) {
      const med = r.media.find(m => (m.discs || []).some(x => x.id === id)) || r.media[0];
      rel = { releaseId: r.id, album: r.title, albumArtist: (r['artist-credit'] || []).map(a => a.name + (a.joinphrase || '')).join(''), year: parseInt(r.date, 10) || null, discNo: med.position, tracks: med.tracks.map(t => ({ n: t.position, title: t.title, artist: (t['artist-credit'] || []).map(a => a.name + (a.joinphrase || '')).join(''), recordingId: t.recording?.id })) };
    }
  } catch { /* unknown disc: rip with generic names */ }
  return {
    supported: true, discId: id, release: rel,
    tracks: rows.map(r => { const t = rel?.tracks.find(x => x.n === r.n); return { n: r.n, seconds: Math.round(r.len / 75), title: t?.title || `Track ${r.n}`, artist: t?.artist || rel?.albumArtist || 'Unknown artist', recordingId: t?.recordingId }; })
  };
}
async function cdRip(info, cfg, onProgress, readTags, onAdded) {
  const rel = info.release || {};
  const dir = path.join(cfg.downloadDir, clean(rel.albumArtist || 'Unknown artist'), clean(rel.album || `CD ${info.discId.slice(0, 8)}`));
  fs.mkdirSync(dir, { recursive: true });
  const cover = rel.releaseId ? await coverFor(rel.releaseId) : null;
  for (const t of info.tracks) {
    const base = path.join(dir, `${String(t.n).padStart(2, '0')} ${clean(t.title)}`);
    onProgress({ n: t.n, step: 'reading' });
    await new Promise((res, rej) => { const p = spawn('cdparanoia', ['-q', '-w', String(t.n), base + '.wav']); p.on('close', c => (c ? rej(new Error(`cdparanoia failed on track ${t.n}`)) : res())); });
    onProgress({ n: t.n, step: 'encoding' });
    await new Promise((res, rej) => { const p = spawn('flac', ['-s', '-f', '--best', '-o', base + '.flac', base + '.wav']); p.on('close', c => (c ? rej(new Error(`flac failed on track ${t.n}`)) : res())); });
    fs.rmSync(base + '.wav', { force: true });
    const meta = { title: t.title, artist: t.artist, albumArtist: rel.albumArtist, album: rel.album, year: rel.year, trackNo: t.n, trackCount: info.tracks.length, discNo: rel.discNo, recordingId: t.recordingId, releaseId: rel.releaseId };
    const lyrics = await lyricsFor({ title: t.title, artist: t.artist, album: rel.album, duration: t.seconds });
    await writeTags(base + '.flac', meta, { cover, lyrics });
    onAdded(await readTags(base + '.flac'));
    onProgress({ n: t.n, step: 'done' });
  }
  return dir;
}

// ---------------------------------------------------------------- watch folders
function createWatcher({ readTags, onAdded }) {
  const watchers = new Map();
  const pending = new Map();
  const settle = file => {
    clearTimeout(pending.get(file));
    pending.set(file, setTimeout(async () => {
      pending.delete(file);
      try {
        const a = fs.statSync(file).size; await sleep(1500);
        if (fs.statSync(file).size !== a) return settle(file); // still being written
        onAdded(await readTags(file));
      } catch { /* file vanished */ }
    }, 1200));
  };
  return {
    set(dirs) {
      for (const [d, w] of watchers) if (!dirs.includes(d)) { w.close(); watchers.delete(d); }
      for (const d of dirs) {
        if (watchers.has(d) || !fs.existsSync(d)) continue;
        try {
          const w = fs.watch(d, { recursive: true }, (_ev, name) => {
            if (!name) return;
            const file = path.join(d, name.toString());
            if (AUDIO_EXT.has(path.extname(file).toLowerCase()) && !file.endsWith('.part') && fs.existsSync(file)) settle(file);
          });
          watchers.set(d, w);
        } catch { /* folder not watchable */ }
      }
      return [...watchers.keys()];
    }
  };
}

module.exports = {
  resolveLink, buyLinks, providerList, searchSources, sourceTracks, findFree,
  metaLookup, metaApply, createQueue, cdStatus, cdInfo, cdRip, createWatcher, discId,
  lyricsFor, coverFor // also used by the mobile app
};
