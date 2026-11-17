// Sonoma "Get music": resolve links, legal download sources (extensions), download queue,
// metadata fixing, CD ripping, watch folders and playlist availability.
(function () {
  const api = window.sonoma;
  const errText = e => String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  Object.assign(IC, {
    getF: '<path d="M12 3v11.5" stroke-width="2.4"/><path d="m7 10 5 5 5-5" stroke-width="2.4"/><rect x="3" y="17" width="18" height="4" rx="1.5" fill="currentColor" stroke="none"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    cart: '<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
    wand: '<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20 14 10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', retry: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>', ext: '<path d="M14 3h7v7M10 14 21 3M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>'
  });

  // ---------- nav entry ----------
  const nav = $('#nav');
  const navBtn = document.createElement('button');
  navBtn.dataset.view = 'get'; navBtn.dataset.ic = 'getF'; navBtn.title = 'Get music';
  navBtn.innerHTML = '<b id="dlDot" class="dot hidden" style="background:#5fb0ff"></b>';
  nav.insertBefore(navBtn, nav.querySelector('[data-view="rooms"]'));
  hydrateIcons(nav);

  // ---------- library growth from downloads, rips and watch folders ----------
  let addTimer;
  api.onAdded(t => {
    const i = S.library.findIndex(x => x.id === t.id);
    if (i >= 0) S.library[i] = t; else S.library.push(t);
    S.playlists.forEach(p => p.items.forEach(it => { if (!it.trackId) { const m = matchTrack(it.title, it.artist); if (m) it.trackId = m.id; } }));
    clearTimeout(addTimer);
    addTimer = setTimeout(() => { libraryChanged(); if (['home', 'library', 'album', 'playlist', 'search'].includes(view)) refreshPlaying(); }, 600);
  });

  // ---------- download queue state ----------
  const jobs = new Map();
  const syncDot = () => { const busy = [...jobs.values()].some(j => /queued|downloading|tagging/.test(j.status)); $('#dlDot').classList.toggle('hidden', !busy); };
  api.onDl(j => { const prev = jobs.get(j.id); jobs.set(j.id, j); syncDot(); if (j.status === 'done' && prev?.status !== 'done') toast(`Downloaded ${j.title}`); if (view === 'get' && tab === 'queue') drawQueue(); });
  api.dlList().then(l => l.forEach(j => jobs.set(j.id, j)));
  async function queueTracks(tracks) {
    if (!S.settings.downloadDir) { toast('Choose a download folder first'); go('get'); tab = 'settings'; render(); return; }
    if (!tracks.length) return toast('Nothing downloadable here');
    await api.dlAdd(tracks);
    toast(tracks.length > 1 ? `Queued ${tracks.length} tracks` : `Queued ${tracks[0].title}`);
  }

  // ---------- the Get music view ----------
  let tab = 'link', lastLink = null, lastSearch = null, srcCache = null, cd = null, cdStep = {};
  const TABS = [['link', 'Paste a link'], ['sources', 'Free & legal'], ['queue', 'Downloads'], ['cd', 'Rip a CD'], ['settings', 'Sources & folders']];
  VIEWS_EXTRA.get = main => {
    main.innerHTML = `<div class="ph"><h1>Get music</h1></div>
      <div class="seg">${TABS.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}${k === 'queue' ? ` <i id="qCount"></i>` : ''}</button>`).join('')}</div>
      <div id="gBody" class="gbody"></div>`;
    main.querySelectorAll('.seg button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    ({ link: tLink, sources: tSources, queue: tQueue, cd: tCd, settings: tSettings }[tab])($('#gBody'));
    const n = [...jobs.values()].filter(j => /queued|downloading|tagging/.test(j.status)).length;
    $('#qCount').textContent = n ? n : '';
  };

  // ----- paste a link
  function tLink(box) {
    box.innerHTML = `<p class="hint">Paste a song or album link from Spotify, Apple Music, YouTube, Tidal, Deezer, SoundCloud or Amazon. Sonoma finds it everywhere, checks your library, and shows where to get a lossless copy legally.</p>
      <form class="linkrow" id="lkForm"><label class="bigsearch">${ic('link')}<input id="lkIn" placeholder="https://open.spotify.com/track/…" value="${esc(lastLink?.input || '')}"></label><button class="btn light" id="lkGo">Find</button></form>
      <div id="lkOut"></div>`;
    $('#lkForm').onsubmit = async e => {
      e.preventDefault();
      const url = $('#lkIn').value.trim(); if (!url) return;
      const b = $('#lkGo'); b.disabled = true; b.textContent = 'Finding…';
      try { lastLink = { input: url, data: await api.resolveLink(url) }; drawLink(); }
      catch (err) { $('#lkOut').innerHTML = `<p class="empty">${esc(errText(err))}</p>`; }
      b.disabled = false; b.textContent = 'Find';
    };
    if (lastLink) drawLink();
  }
  function drawLink() {
    const d = lastLink.data, own = matchTrack(d.title, d.artist);
    const ownAlbum = d.kind === 'album' ? albums().find(a => norm(a.title) === norm(d.title)) : null;
    const LABEL = { spotify: 'Spotify', appleMusic: 'Apple Music', itunes: 'iTunes', youtube: 'YouTube', youtubeMusic: 'YouTube Music', tidal: 'Tidal', deezer: 'Deezer', soundcloud: 'SoundCloud', amazonMusic: 'Amazon Music', amazonStore: 'Amazon Store', pandora: 'Pandora', napster: 'Napster', yandex: 'Yandex', audiomack: 'Audiomack', anghami: 'Anghami', boomplay: 'Boomplay', audius: 'Audius', bandcamp: 'Bandcamp' };
    $('#lkOut').innerHTML = `<div class="rescard">
        <img class="rc-art" src="${esc(d.cover || '')}" alt="">
        <div class="rc-info"><span class="kicker">${esc(d.kind)}</span><h2>${esc(d.title)}</h2><p>${esc(d.artist)}</p>
          <div class="rc-own">${own || ownAlbum ? `${ic('check')} In your library <button class="btn sm" id="rcPlay">${ic('play')} Play</button>` : `Not in your library yet`}</div></div></div>
      <h2 class="sec">Get a lossless copy</h2>
      <div class="opts">
        <div class="opt"><div class="oh">${ic('getF')}<b>Free &amp; legal</b></div><p>Search Internet Archive and other enabled sources for a copy the artist allows you to download.</p><button class="btn" id="rcFree">Search free sources</button><div id="rcFreeOut"></div></div>
        <div class="opt"><div class="oh">${ic('cart')}<b>Buy the FLAC</b></div><p>Buying supports the artist and gets you a file you own forever. Put the downloads in a watch folder and Sonoma adds them automatically.</p>
          <div class="chips">${d.buy.map(s => `<button class="chip lnk" data-u="${esc(s.url)}">${esc(s.name)} <small>${esc(s.note)}</small></button>`).join('')}</div></div>
        <div class="opt"><div class="oh">${ic('globe')}<b>Listen elsewhere</b></div><p>The same release on other services.</p>
          <div class="chips">${d.links.slice(0, 12).map(l => `<button class="chip lnk" data-u="${esc(l.url)}">${esc(LABEL[l.platform] || l.platform)}</button>`).join('')}</div></div>
      </div>`;
    $('#lkOut').querySelectorAll('[data-u]').forEach(b => b.onclick = () => api.openExternal(b.dataset.u));
    if ($('#rcPlay')) $('#rcPlay').onclick = () => own ? playList([own.id], 0) : playList(ownAlbum.tracks.map(t => t.id), 0);
    $('#rcFree').onclick = async () => {
      const out = $('#rcFreeOut'); out.innerHTML = '<p class="hint">Searching…</p>';
      try {
        const q = `${d.artist} ${d.title}`;
        const res = await api.searchSources(q);
        const items = res.flatMap(r => r.items.slice(0, 4).map(i => ({ ...i, source: r.id, sourceName: r.name })));
        out.innerHTML = items.length ? `<div class="mini">${items.map((i, k) => `<button class="mrow" data-k="${k}">${i.cover ? `<img src="${esc(i.cover)}" alt="">` : ''}<span><b>${esc(i.title)}</b><small>${esc(i.artist || '')} · ${esc(i.sourceName)}</small></span></button>`).join('')}</div>` : '<p class="hint">No free legal copy found. Buying is the way to go for this one.</p>';
        out.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const i = items[+b.dataset.k]; tab = 'sources'; lastSearch = { q, res }; srcCache = null; render(); openItem(i.source, i); });
      } catch (err) { out.innerHTML = `<p class="hint">${esc(errText(err))}</p>`; }
    };
  }

  // ----- free & legal sources
  function tSources(box) {
    box.innerHTML = `<p class="hint">Only sources whose music may be downloaded: artist-approved live recordings, public domain and Creative Commons. Manage them under <a href="#" id="toSet">Sources &amp; folders</a>.</p>
      <form class="linkrow" id="srForm"><label class="bigsearch">${ic('search')}<input id="srIn" placeholder="Artist, album or song" value="${esc(lastSearch?.q || '')}"></label><button class="btn light">Search</button></form>
      <div id="srOut"></div>`;
    $('#toSet').onclick = e => { e.preventDefault(); tab = 'settings'; render(); };
    $('#srForm').onsubmit = async e => {
      e.preventDefault();
      const q = $('#srIn').value.trim(); if (!q) return;
      $('#srOut').innerHTML = '<p class="hint">Searching…</p>';
      try { lastSearch = { q, res: await api.searchSources(q) }; srcCache = null; drawSources(); }
      catch (err) { $('#srOut').innerHTML = `<p class="empty">${esc(errText(err))}</p>`; }
    };
    if (srcCache) showTracks(); else if (lastSearch) drawSources();
  }
  function drawSources() {
    const out = $('#srOut'); if (!out) return;
    out.innerHTML = lastSearch.res.map(r => `<h2 class="sec">${esc(r.name)}</h2>${r.error ? `<p class="hint">${esc(r.error)}</p>` : r.items.length ? `<div class="grid">${r.items.map((i, k) => `<div class="tile" data-s="${r.id}" data-k="${k}">${i.cover ? `<div class="cover" style="background-image:url('${esc(i.cover)}')"></div>` : coverHTML(null)}<b>${esc(i.title)}</b><span>${esc(i.artist || '')}${i.year ? ' · ' + i.year : ''}</span><span class="lic">${i.kind === 'track' ? 'Song' : 'Album'} · ${/creativecommons|publicdomain/.test(i.license || '') ? 'Creative Commons' : 'Free download'}</span></div>`).join('')}</div>` : '<p class="hint">No results.</p>'}`).join('');
    out.querySelectorAll('[data-s]').forEach(el => el.onclick = () => openItem(el.dataset.s, lastSearch.res.find(r => r.id === el.dataset.s).items[+el.dataset.k]));
  }
  async function openItem(source, item) {
    const out = $('#srOut'); if (out) out.innerHTML = '<p class="hint">Loading tracks…</p>';
    try { srcCache = { source, item, tracks: await api.sourceTracks({ source, item }) }; showTracks(); }
    catch (err) { if (out) out.innerHTML = `<p class="empty">${esc(errText(err))}</p>`; }
  }
  function showTracks() {
    const { item, tracks } = srcCache; const out = $('#srOut'); if (!out) return;
    const fmt = [...new Set(tracks.map(t => t.ext.replace('.', '').toUpperCase()))].join(' / ') || '—';
    out.innerHTML = `<button class="btn sm" id="srBack">← Results</button>
      <div class="rescard"><img class="rc-art" src="${esc(item.cover || '')}" alt=""><div class="rc-info"><span class="kicker">${tracks.length} tracks · ${fmt}</span><h2>${esc(item.title)}</h2><p>${esc(item.artist || '')}</p>
        <p class="lic">License: ${/^https?:/.test(item.license || '') ? `<a href="#" data-u="${esc(item.license)}">${esc(item.license.replace(/^https?:\/\//, ''))}</a>` : esc(item.license || 'see source page')}${item.page ? ` · <a href="#" data-u="${esc(item.page)}">source page</a>` : ''}</p>
        <div class="row"><button class="btn light" id="srAll">${ic('getF')} Download all</button></div></div></div>
      <div class="list noalbum">${tracks.map((t, i) => `<div class="tr"><div class="n">${t.trackNo || i + 1}</div><div class="ttl"><div style="min-width:0"><div class="tt">${esc(t.title)}</div><span class="ta">${esc(t.artist)}</span></div></div><div class="d">${t.ext.replace('.', '').toUpperCase()}</div><button class="k" data-i="${i}" title="Download">${ic('getF')}</button></div>`).join('')}</div>`;
    hydrateIcons(out);
    out.querySelectorAll('[data-u]').forEach(a => a.onclick = e => { e.preventDefault(); api.openExternal(a.dataset.u); });
    $('#srBack').onclick = () => { srcCache = null; drawSources(); };
    $('#srAll').onclick = () => queueTracks(tracks);
    out.querySelectorAll('[data-i]').forEach(b => b.onclick = () => queueTracks([tracks[+b.dataset.i]]));
  }

  // ----- downloads
  function tQueue(box) { box.innerHTML = '<div id="qList"></div>'; drawQueue(); }
  function drawQueue() {
    const el = $('#qList'); if (!el) return;
    const all = [...jobs.values()].reverse();
    const n = all.filter(j => /queued|downloading|tagging/.test(j.status)).length;
    if ($('#qCount')) $('#qCount').textContent = n || '';
    el.innerHTML = `<div class="row" style="margin:0 6px 12px 12px"><span class="hint" style="margin:0;flex:1">${S.settings.downloadDir ? `Saving to ${esc(S.settings.downloadDir)}` : 'No download folder chosen yet.'}</span>
        ${S.settings.downloadDir ? `<button class="btn sm" id="qOpen">${ic('folder')} Open folder</button>` : ''}<button class="btn sm" id="qClear">Clear finished</button></div>
      ${all.length ? `<div class="list noalbum">${all.map(j => `<div class="tr qj ${j.status}"><div class="n">${{ done: ic('check'), error: '!', cancelled: '–' }[j.status] || ''}</div>
        <div class="ttl"><div style="min-width:0;flex:1"><div class="tt">${esc(j.title)}</div><span class="ta">${esc(j.artist || '')}${j.album ? ' · ' + esc(j.album) : ''} — ${esc(j.error || { queued: 'Waiting', downloading: `Downloading ${Math.round((j.progress || 0) * 100)}%`, tagging: 'Writing tags, cover & lyrics', done: 'Added to your library', cancelled: 'Cancelled' }[j.status])}</span>
        ${j.status === 'downloading' ? `<div class="pbar"><i style="width:${Math.round((j.progress || 0) * 100)}%"></i></div>` : ''}</div></div>
        <div class="d"></div>${/queued|downloading/.test(j.status) ? `<button class="k" data-c="${j.id}" title="Cancel">${ic('x')}</button>` : /error|cancelled/.test(j.status) ? `<button class="k" data-r="${j.id}" title="Retry">${ic('retry')}</button>` : '<span></span>'}</div>`).join('')}</div>`
      : '<p class="empty">Nothing downloading. Find free music under “Free &amp; legal”.</p>'}`;
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => api.dlCancel(b.dataset.c));
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => api.dlRetry(b.dataset.r));
    $('#qClear').onclick = async () => { const l = await api.dlClear(); jobs.clear(); l.forEach(j => jobs.set(j.id, j)); drawQueue(); syncDot(); };
    if ($('#qOpen')) $('#qOpen').onclick = () => api.openPath(S.settings.downloadDir);
  }

  // ----- CD ripping
  function tCd(box) {
    box.innerHTML = `<p class="hint">Rip your own CDs to FLAC. Sonoma reads the disc, looks it up on MusicBrainz, then saves tagged FLAC files with cover art into your download folder.</p>
      <button class="btn light" id="cdRead" style="margin-left:12px">${ic('disc')} Read disc</button><div id="cdOut" style="margin-top:16px"></div>`;
    $('#cdRead').onclick = async () => {
      $('#cdOut').innerHTML = '<p class="hint">Reading the disc…</p>';
      try { cd = await api.cdInfo(); drawCd(); } catch (err) { $('#cdOut').innerHTML = `<p class="empty">${esc(errText(err))}</p>`; }
    };
    if (cd) drawCd();
  }
  function drawCd() {
    const out = $('#cdOut'); if (!out) return;
    if (!cd.supported) { out.innerHTML = `<div class="card"><h3>CD ripping isn't available here</h3><p>${esc(cd.reason)}</p></div>`; return; }
    const r = cd.release;
    out.innerHTML = `<div class="rescard"><div class="cover rc-art">${ic('disc')}</div><div class="rc-info"><span class="kicker">${cd.tracks.length} tracks${r ? '' : ' · not found on MusicBrainz'}</span><h2>${esc(r?.album || 'Unknown disc')}</h2><p>${esc(r?.albumArtist || '')}${r?.year ? ' · ' + r.year : ''}</p><div class="row"><button class="btn light" id="cdRip">${ic('getF')} Rip to FLAC</button></div></div></div>
      <div class="list noalbum">${cd.tracks.map(t => `<div class="tr"><div class="n">${t.n}</div><div class="ttl"><div style="min-width:0"><div class="tt">${esc(t.title)}</div><span class="ta">${esc(t.artist)} — ${esc({ reading: 'Reading…', encoding: 'Encoding FLAC…', done: 'Done' }[cdStep[t.n]] || 'Waiting')}</span></div></div><div class="d">${fmt(t.seconds)}</div><span></span></div>`).join('')}</div>`;
    $('#cdRip').onclick = async () => {
      $('#cdRip').disabled = true; cdStep = {};
      try { const dir = await api.cdRip(cd); toast('CD ripped'); cdStep = {}; S.settings.lastRip = dir; }
      catch (err) { toast(errText(err)); }
      if ($('#cdRip')) $('#cdRip').disabled = false;
    };
  }
  api.onCd(p => { cdStep[p.n] = p.step; if (view === 'get' && tab === 'cd') drawCd(); });

  // ----- sources (extensions) & folders
  async function tSettings(box) {
    const st = S.settings;
    st.sources ??= ['archive'];
    st.watchFolders ??= [];
    const provs = await api.providers();
    box.innerHTML = `<div class="cards">
      <div class="card"><h3>Download folder</h3><p>Where downloads and CD rips are saved, sorted into Artist / Album folders.</p>
        <div class="row"><input id="gsDir" readonly value="${esc(st.downloadDir || '')}" placeholder="Not set"><button class="btn" id="gsPick">${ic('folder')} Choose…</button></div>
        <div class="field" style="margin-top:14px"><label>Downloads at the same time</label><select id="gsConc">${[1, 2, 3, 4].map(n => `<option ${+(st.concurrency || 2) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div class="card"><h3>Watch folders</h3><p>New audio files that land here are added to your library automatically, e.g. the folder your Bandcamp or Qobuz purchases download into.</p>
        <div id="gsWatch">${st.watchFolders.map((d, i) => `<div class="wrow"><span>${esc(d)}</span><button class="k" data-w="${i}" title="Stop watching">${ic('x')}</button></div>`).join('') || '<p class="hint" style="margin:0 0 10px">No folders yet.</p>'}</div>
        <button class="btn" id="gsAddW">${ic('plus')} Add folder</button></div>
    </div>
    <h2 class="sec">Sources</h2>
    <div class="cards">${provs.map(p => `<div class="card src"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h3>${esc(p.name)}</h3><input type="checkbox" data-src="${p.id}" ${st.sources.includes(p.id) ? 'checked' : ''}></div><p>${esc(p.description)}</p>
      ${p.needsKey ? `<div class="field"><label>${esc(p.keyLabel)}</label><input data-key="${p.id}" value="${esc(st[p.id + 'Id'] || '')}" placeholder="Paste key"></div><p class="hint" style="margin:0">${esc(p.keyHelp)}</p>` : ''}</div>`).join('')}</div>`;
    hydrateIcons(box);
    $('#gsPick').onclick = async () => { const d = await api.pickFolder(); if (d) { st.downloadDir = d; save(); render(); } };
    $('#gsConc').onchange = e => { st.concurrency = +e.target.value; save(); };
    $('#gsAddW').onclick = async () => { const d = await api.pickFolder(); if (d && !st.watchFolders.includes(d)) { st.watchFolders.push(d); save(); await api.setWatch(st.watchFolders); render(); } };
    box.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => { st.watchFolders.splice(+b.dataset.w, 1); save(); await api.setWatch(st.watchFolders); render(); });
    box.querySelectorAll('[data-src]').forEach(c => c.onchange = () => { const id = c.dataset.src; st.sources = c.checked ? [...new Set([...st.sources, id])] : st.sources.filter(x => x !== id); save(); });
    box.querySelectorAll('[data-key]').forEach(i => i.onchange = () => { st[i.dataset.key + 'Id'] = i.value.trim(); save(); toast('Saved'); });
  }

  // ---------- fix metadata ----------
  async function fixMeta(t) {
    const m = $('#modal');
    m.innerHTML = `<div class="box wide"><h3>Fix metadata</h3><p class="hint" style="margin:0 0 12px">${esc(t.title)} · ${esc(t.artist)}</p><div id="fmList"><p class="hint">Looking up MusicBrainz…</p></div><div class="row"><button class="btn" id="fmClose">Close</button></div></div>`;
    m.classList.remove('hidden');
    $('#fmClose').onclick = () => m.classList.add('hidden');
    try {
      const c = await api.metaLookup({ title: t.title, artist: t.artist === 'Unknown artist' ? '' : t.artist, album: t.album, duration: t.duration });
      if (!$('#fmList')) return;
      $('#fmList').innerHTML = c.length ? c.map((x, i) => `<button class="mrow" data-m="${i}"><span><b>${esc(x.title)}</b><small>${esc(x.artist)} · ${esc(x.album)}${x.year ? ' · ' + x.year : ''}${x.trackNo ? ` · track ${x.trackNo}` : ''}</small></span><em>${Math.max(0, Math.min(100, x.score))}%</em></button>`).join('') : '<p class="hint">No match found on MusicBrainz.</p>';
      $('#fmList').querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
        $('#fmList').innerHTML = '<p class="hint">Writing tags, cover art and lyrics…</p>';
        try {
          const r = await api.metaApply({ file: t.path, candidate: c[+b.dataset.m], base: t });
          const i = S.library.findIndex(x => x.id === t.id); if (i >= 0) S.library[i] = { ...r.track, explicit: t.explicit };
          libraryChanged(); m.classList.add('hidden'); toast('Metadata updated'); refreshPlaying();
        } catch (err) { $('#fmList').innerHTML = `<p class="hint">${esc(errText(err))}</p>`; }
      });
    } catch (err) { if ($('#fmList')) $('#fmList').innerHTML = `<p class="hint">${esc(errText(err))}</p>`; }
  }
  async function fixAlbum(tracks) {
    toast(`Fixing ${tracks.length} tracks…`);
    let ok = 0;
    for (const t of tracks) {
      try { const r = await api.metaApply({ file: t.path, base: t }); const i = S.library.findIndex(x => x.id === t.id); if (i >= 0) S.library[i] = r.track; ok++; } catch { /* skip */ }
    }
    libraryChanged(); render(); toast(`Updated ${ok} of ${tracks.length} tracks`);
  }

  // ---------- availability for songs you don't have ----------
  async function buyMenu(x, y, title, artist) {
    const links = await api.buyLinks({ title, artist });
    showMenu(x, y, [{ label: 'Buy lossless' }, ...links.map(l => ({ icon: 'cart', text: `${l.name} · ${l.note}`, action: () => api.openExternal(l.url) }))]);
  }
  async function getFree(title, artist) {
    toast(`Looking for a free legal copy of ${title}…`);
    try {
      const hit = await api.findFree({ title, artist });
      if (!hit) return toast('No free legal copy found. Try buying it.');
      const tracks = await api.sourceTracks({ source: hit.source, item: hit.item });
      const one = tracks.filter(t => norm(t.title) === norm(title)).slice(0, 1);
      await queueTracks(one.length ? one : tracks.slice(0, 1));
    } catch (err) { toast(errText(err)); }
  }

  const _trackMenu = trackMenu;
  trackMenu = function (x, y, row, idx, ctx) {
    _trackMenu(x, y, row, idx, ctx);
    const t = row.trackId ? byId(row.trackId) : null;
    const menu = $('#menu');
    const extra = t
      ? [{ icon: 'wand', text: 'Fix metadata…', action: () => fixMeta(t) }]
      : [{ icon: 'getF', text: 'Find free download', action: () => getFree(row.title, row.artist) }, { icon: 'cart', text: 'Buy lossless…', action: () => buyMenu(x, y, row.title, row.artist) }];
    const frag = document.createDocumentFragment();
    for (const it of extra) { const b = document.createElement('button'); b.innerHTML = `${ic(it.icon)}<span>${esc(it.text)}</span>`; b.onclick = () => { hideMenu(); it.action(); }; frag.appendChild(b); }
    menu.insertBefore(frag, menu.firstChild);
    const r = menu.getBoundingClientRect();
    menu.style.top = Math.max(8, Math.min(parseFloat(menu.style.top), innerHeight - r.height - 8)) + 'px';
  };

  const _plMenu = plMenu;
  plMenu = pl => {
    const missing = pl.items.filter(i => !i.trackId);
    return [
      ...(missing.length ? [{ icon: 'getF', text: `Check ${missing.length} missing songs`, action: () => checkPlaylist(pl) }] : []),
      ..._plMenu(pl)
    ];
  };
  async function checkPlaylist(pl) {
    const missing = pl.items.filter(i => !i.trackId);
    toast(`Checking ${missing.length} songs…`);
    for (const it of missing) {
      try { it.free = await api.findFree({ title: it.title, artist: it.artist }); } catch { it.free = null; }
      it.checked = true;
    }
    save(); if (view === 'playlist' && viewArg === pl.id) render();
    const n = missing.filter(i => i.free).length;
    toast(n ? `${n} of ${missing.length} missing songs are free to download` : 'None of the missing songs are free; use “Buy” to get them');
  }
  const _vPlaylist = VIEWS_EXTRA.playlist || vPlaylist;
  VIEWS_EXTRA.playlist = main => {
    _vPlaylist(main);
    const pl = S.playlists.find(p => p.id === viewArg); if (!pl) return;
    const missing = pl.items.filter(i => !i.trackId);
    if (!missing.length) return;
    const free = missing.filter(i => i.free);
    const box = document.createElement('div');
    box.innerHTML = `<h2 class="sec">Missing from your library <small>${missing.length}</small></h2>
      <div class="row" style="margin:0 6px 12px 12px">${missing.some(i => !i.checked) ? `<button class="btn" id="avCheck">${ic('search')} Check availability</button>` : ''}${free.length ? `<button class="btn light" id="avAll">${ic('getF')} Download ${free.length} free</button>` : ''}</div>
      <div class="list noalbum">${missing.map((it, i) => `<div class="tr"><div class="n">${ic('music')}</div><div class="ttl"><div style="min-width:0"><div class="tt">${esc(it.title)}</div><span class="ta">${esc(it.artist || '')}</span></div></div>
        <div class="d">${it.free ? `<span class="pill ok">Free · ${esc(it.free.sourceName)}</span>` : it.checked ? '<span class="pill">Buy</span>' : ''}</div>
        <button class="k" data-av="${i}" title="Options">${ic('kebab')}</button></div>`).join('')}</div>`;
    main.appendChild(box); hydrateIcons(box);
    if ($('#avCheck')) $('#avCheck').onclick = () => checkPlaylist(pl);
    if ($('#avAll')) $('#avAll').onclick = async () => { for (const it of free) await getFree(it.title, it.artist); };
    box.querySelectorAll('[data-av]').forEach(b => b.onclick = e => { const it = missing[+b.dataset.av]; const r = b.getBoundingClientRect();
      showMenu(r.right - 220, r.bottom + 4, [{ icon: 'getF', text: 'Find free download', action: () => getFree(it.title, it.artist) }, { icon: 'cart', text: 'Buy lossless…', action: () => buyMenu(r.right - 220, r.bottom + 4, it.title, it.artist) }]); e.stopPropagation(); });
  };

  // album "more" menu: fix every track at once
  const _vAlbum = vAlbum;
  VIEWS_EXTRA.album = main => {
    _vAlbum(main);
    const a = albums().find(x => x.key === viewArg); if (!a) return;
    const more = $('#hMore'); if (!more) return;
    const old = more.onclick;
    more.onclick = e => { old(e); const menu = $('#menu'); const b = document.createElement('button'); b.innerHTML = `${ic('wand')}<span>Fix metadata for album</span>`; b.onclick = () => { hideMenu(); fixAlbum(a.tracks); }; menu.appendChild(b); };
  };

  // start watching folders saved from a previous session
  setTimeout(() => { if (S.settings.watchFolders?.length) api.setWatch(S.settings.watchFolders); }, 1500);
})();
