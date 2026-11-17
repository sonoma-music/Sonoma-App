// Lyrics: LRC parsing (incl. enhanced word timings), word-time estimation, and lookup.
(function () {
  const TIME = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
  const WORD = /<(\d+):(\d+(?:\.\d+)?)>/g;
  const toSec = (m, s) => Number(m) * 60 + Number(s);

  function parseLRC(text) {
    const lines = [];
    for (const raw of String(text).split(/\r?\n/)) {
      const stamps = [...raw.matchAll(TIME)];
      if (!stamps.length) continue;
      const body = raw.replace(TIME, '').trim();
      let words = null;
      if (WORD.test(body)) {
        WORD.lastIndex = 0;
        words = [];
        const parts = body.split(WORD); // [pre, m, s, text, m, s, text...]
        for (let i = 1; i < parts.length; i += 3) {
          const t = toSec(parts[i], parts[i + 1]);
          const chunk = parts[i + 2] || '';
          chunk.split(/(\s+)/).filter(x => x.trim()).forEach((w, k) => words.push({ time: t + k * 0.01, text: w }));
        }
      }
      const plain = body.replace(WORD, '').replace(/\s+/g, ' ').trim();
      for (const s of stamps) lines.push({ time: toSec(s[1], s[2]), text: plain, words });
    }
    lines.sort((a, b) => a.time - b.time);
    // estimate per-word timings for plain line-synced lyrics
    lines.forEach((l, i) => {
      if (l.words || !l.text) return;
      const next = lines[i + 1] ? lines[i + 1].time : l.time + 5;
      const span = Math.min(Math.max(next - l.time, 0.5), 8) * 0.9;
      const toks = l.text.split(' ');
      const total = toks.reduce((a, w) => a + w.length + 1, 0);
      let acc = 0;
      l.words = toks.map(w => { const t = l.time + (acc / total) * span; acc += w.length + 1; return { time: t, text: w }; });
      l.estimated = true;
    });
    return lines;
  }

  const cache = new Map();
  async function lrclib(track) {
    const q = new URLSearchParams({ artist_name: track.artist, track_name: track.title });
    if (track.album) q.set('album_name', track.album);
    if (track.duration) q.set('duration', Math.round(track.duration));
    let r = await fetch('https://lrclib.net/api/get?' + q);
    if (r.ok) return r.json();
    r = await fetch('https://lrclib.net/api/search?' + new URLSearchParams({ track_name: track.title, artist_name: track.artist }));
    if (!r.ok) return null;
    const list = await r.json();
    return list.find(x => x.syncedLyrics) || list[0] || null;
  }

  // returns { type:'synced'|'plain'|'none', lines, source }
  async function getLyrics(track) {
    if (cache.has(track.id)) return cache.get(track.id);
    let result = { type: 'none', lines: [], source: '' };
    try {
      const local = track.path ? await window.sonoma.localLyrics(track.path) : null;
      if (local && TIME.test(local)) {
        TIME.lastIndex = 0;
        result = { type: 'synced', lines: parseLRC(local), source: 'Local .lrc' };
      } else {
        const hit = await lrclib(track);
        if (hit?.syncedLyrics) result = { type: 'synced', lines: parseLRC(hit.syncedLyrics), source: 'LRCLIB' };
        else if (hit?.plainLyrics) result = { type: 'plain', lines: hit.plainLyrics.split(/\r?\n/).map(text => ({ text })), source: 'LRCLIB (unsynced)' };
      }
    } catch (e) {
      result = { type: 'none', lines: [], source: 'offline' };
    }
    if (result.type !== 'none') cache.set(track.id, result);
    return result;
  }

  window.Lyrics = { parseLRC, getLyrics };
})();
