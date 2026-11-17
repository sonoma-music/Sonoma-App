// Dev-only mock of the Electron preload API with demo data (used by dev/serve.js).
(() => {
  const enc = s => 'data:image/svg+xml,' + encodeURIComponent(s);
  // Album art: bright blue field with white strokes and a dark figure.
  const c1 = enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#2a9df4"/>
    <rect width="200" height="200" fill="url(#g)"/>
    <defs><radialGradient id="g" cx=".7" cy=".2" r=".9"><stop offset="0" stop-color="#7cc8ff" stop-opacity=".7"/><stop offset="1" stop-color="#0b5cc0" stop-opacity=".5"/></radialGradient></defs>
    <g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round">
      <path d="M40 60v110M58 52v118M76 48v122M94 50v120"/>
    </g>
    <path d="M30 60 Q70 30 110 52 L170 40 L172 50 L120 66 Q112 120 128 200 L92 200 Q86 130 96 70 Q70 52 34 70Z" fill="#0d1a3a"/>
    <circle cx="112" cy="34" r="14" fill="#0d1a3a"/>
    <path d="M104 80 Q110 130 104 190" stroke="#fff" stroke-width="5" fill="none"/>
    <rect x="160" y="178" width="30" height="14" fill="#fff"/><rect x="163" y="181" width="24" height="8" fill="#111"/>
  </svg>`);
  // Now-playing art: grey monochrome collage.
  const c2 = enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#d9d9d9"/><circle cx="50" cy="50" r="34" fill="#222"/>
    <circle cx="50" cy="50" r="26" fill="#eee"/><path d="M28 40 Q50 20 72 40 L66 62 Q50 74 34 62Z" fill="#333"/>
    <circle cx="42" cy="46" r="4" fill="#eee"/><circle cx="58" cy="46" r="4" fill="#eee"/></svg>`);
  const c3 = enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a5a"/><stop offset="1" stop-color="#c2185b"/></linearGradient></defs><rect width="100" height="100" fill="url(#a)"/><circle cx="64" cy="38" r="18" fill="#fff3e0"/><path d="M0 78 Q30 58 55 74 T100 70V100H0Z" fill="#4a0f2e"/></svg>`);
  const c4 = enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0f2a1e"/><g fill="none" stroke="#7be0a5" stroke-width="2.5">${[10, 20, 30, 40].map(r => `<circle cx="50" cy="50" r="${r}"/>`).join('')}</g></svg>`);

  const names = ['TV', 'Mulholland', 'evil icon baby', 'pleasure', 'NAKED', 'Razorblade kiss', 'Pretty Girls', 'andy warhol', '1 more', 'BABYLON', 'Static', 'Sundown', 'Velvet', 'Outro'];
  const durs = [189, 159, 142, 198, 208, 189, 178, 177, 122, 147, 201, 175, 166, 190];
  const ex = [1, 3, 4, 6, 7, 8, 9];
  const library = names.map((t, i) => ({ id: 'demo' + i, path: 'demo' + i, title: t, artist: 'Demo Artist', albumArtist: 'Demo Artist', album: 'Shh...', year: 2026, trackNo: i + 1, duration: durs[i], cover: c1, explicit: ex.includes(i) }));
  library.push({ id: 'x', path: 'x', title: 'Gestalt', artist: '17 Seventeen', albumArtist: '17 Seventeen', album: 'Gestalt', year: 2025, trackNo: 1, duration: 200, cover: c2 });
  ['Amber', 'Low Tide', 'Paper Moon'].forEach((t, i) => library.push({ id: 'y' + i, path: 'y' + i, title: t, artist: 'Golden Hour', albumArtist: 'Golden Hour', album: 'Sunset Rows', year: 2024, trackNo: i + 1, duration: 180 + i * 20, cover: c3 }));
  ['Orbit', 'Signal'].forEach((t, i) => library.push({ id: 'z' + i, path: 'z' + i, title: t, artist: 'North Fields', albumArtist: 'North Fields', album: 'Rings', year: 2023, trackNo: i + 1, duration: 210 + i * 15, cover: c4 }));

  window.sonoma = {
    getStore: async () => ({ library, playlists: [{ id: 'p1', name: 'Late night', items: library.slice(0, 5).map(t => ({ trackId: t.id, title: t.title, artist: t.artist })) }] }),
    setStore: async () => true, pickLibrary: async () => [], onLibraryProgress() {},
    localLyrics: async () => null, importM3U: async () => null, importSpotify: async () => null,
    winMin() {}, winMax() {}, winClose() {}, copy: async () => true, openExternal() {}, onOpenLink() {}, mediaUrl: () => '',
    // Get music (demo answers only)
    resolveLink: async () => ({ kind: 'song', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', cover: c3,
      links: ['spotify', 'appleMusic', 'youtubeMusic', 'deezer', 'tidal', 'soundcloud'].map(p => ({ platform: p, url: 'https://example.com' })),
      buy: [['Qobuz Store', 'Hi-res FLAC'], ['Bandcamp', 'FLAC, artist-friendly'], ['7digital', 'FLAC / MP3'], ['HDtracks', 'Hi-res FLAC']].map(([name, note]) => ({ name, note, url: 'https://example.com' })) }),
    buyLinks: async () => [{ name: 'Qobuz Store', note: 'Hi-res FLAC', url: 'https://example.com' }],
    providers: async () => [
      { id: 'archive', name: 'Internet Archive', description: 'Live concerts (etree, artist-approved taping), public-domain and Creative Commons audio. Many items in FLAC.', needsKey: false },
      { id: 'jamendo', name: 'Jamendo', description: 'Independent artists publishing under Creative Commons. Downloads in FLAC or MP3.', needsKey: true, keyLabel: 'Jamendo client ID', keyHelp: 'Free at devportal.jamendo.com.' }],
    searchSources: async () => [{ id: 'archive', name: 'Internet Archive', items: [1, 2, 3, 4].map(i => ({ key: 'k' + i, kind: 'album', title: 'Live at the Fillmore 19' + (70 + i), artist: 'Demo Band', year: 1970 + i, cover: [c1, c3, c4, c2][i - 1], license: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' })) }],
    sourceTracks: async () => ['Intro', 'Opening Jam', 'Slow Song', 'Encore'].map((t, i) => ({ title: t, artist: 'Demo Band', album: 'Live at the Fillmore', trackNo: i + 1, ext: '.flac', url: 'https://example.com/x.flac' })),
    findFree: async () => null, dlAdd: async t => [], dlList: async () => [
      { id: 'a', title: 'Opening Jam', artist: 'Demo Band', album: 'Live at the Fillmore', status: 'downloading', progress: .42 },
      { id: 'b', title: 'Slow Song', artist: 'Demo Band', album: 'Live at the Fillmore', status: 'queued', progress: 0 },
      { id: 'c', title: 'Intro', artist: 'Demo Band', album: 'Live at the Fillmore', status: 'done', progress: 1 }],
    dlCancel() {}, dlRetry() {}, dlClear: async () => [], onDl() {}, onAdded() {},
    metaLookup: async () => [], metaApply: async () => ({}), cdInfo: async () => ({ supported: false, reason: 'CD ripping uses cdparanoia and flac, which run on Linux.' }),
    cdRip: async () => '', onCd() {}, setWatch: async () => [], pickFolder: async () => null, openPath() {}
  };

  // Puts the UI into a demo state without playing audio: window.__demo('album' | 'home' | ...)
  window.__demo = v => {
    const t = byId('x');
    P.queue = ['x']; P.index = 0; P.current = t; P.shuffle = true;
    $('#nowTitle').textContent = t.title; $('#nowArtist').textContent = t.artist;
    $('#nowCover').outerHTML = coverHTML(t.cover).replace('class="cover ', 'id="nowCover" class="cover ');
    $('#bar').style.setProperty('--nc', `url('${t.cover}')`);
    syncModeBtns();
    if (v === 'album' || !v) go('album', albums().find(a => a.title === 'Shh...').key); else if (v.startsWith('get')) { S.settings.downloadDir = 'D:\Music\Sonoma'; go('get'); } else go(v);
  };
  addEventListener('load', () => setTimeout(() => { const v = location.search.slice(1); if (v) window.__demo(v); }, 300));
})();
