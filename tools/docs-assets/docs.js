// Sonoma docs: copy buttons, search, mobile menu and "on this page" highlighting.
(() => {
  // copy code
  document.querySelectorAll('.code .copy').forEach(b => b.addEventListener('click', async () => {
    const text = b.parentElement.querySelector('code').innerText;
    try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; b.classList.add('done'); }
    catch { b.textContent = 'Press Ctrl+C'; }
    setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1400);
  }));

  // mobile menu
  const menu = document.getElementById('menu'), side = document.getElementById('side');
  menu.addEventListener('click', () => { const o = side.classList.toggle('open'); menu.classList.toggle('open', o); menu.setAttribute('aria-label', o ? 'Close navigation' : 'Open navigation'); });

  // highlight the current section in the right-hand table of contents
  const tocLinks = [...document.querySelectorAll('.toc a')];
  if (tocLinks.length) {
    const heads = tocLinks.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
    const onScroll = () => {
      let cur = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top < 120) cur = h;
      tocLinks.forEach(a => a.classList.toggle('on', a.hash === '#' + cur.id));
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // search
  const q = document.getElementById('q'), box = document.getElementById('results');
  let index = null, sel = -1;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = async () => { if (!index) { try { index = await (await fetch('/search.json')).json(); } catch { index = []; } } return index; };
  const hl = (text, words) => { let out = esc(text); words.forEach(w => { out = out.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>'); }); return out; };
  async function run() {
    const term = q.value.trim().toLowerCase();
    if (!term) { box.classList.remove('open'); return; }
    const words = term.split(/\s+/).filter(Boolean);
    const hits = [];
    for (const p of await load()) {
      const hay = (p.t + ' ' + p.x).toLowerCase();
      if (!words.every(w => hay.includes(w))) continue;
      let score = words.reduce((s, w) => s + (p.t.toLowerCase().includes(w) ? 10 : 0), 0);
      const head = p.h.find(([t]) => words.some(w => t.toLowerCase().includes(w)));
      if (head) score += 5;
      const i = p.x.toLowerCase().indexOf(words[0]);
      const snip = (i > 40 ? '…' : '') + p.x.slice(Math.max(0, i - 40), i + 90) + '…';
      hits.push({ score, url: p.u + (head ? '#' + head[1] : ''), title: head ? `${p.t} › ${head[0]}` : p.t, snip });
    }
    hits.sort((a, b) => b.score - a.score);
    sel = hits.length ? 0 : -1;
    box.innerHTML = hits.length ? hits.slice(0, 8).map((h, i) => `<a href="${h.url}" class="${i === 0 ? 'sel' : ''}">${hl(h.title, words)}<small>${hl(h.snip, words)}</small></a>`).join('') : '<p>No results.</p>';
    box.classList.add('open');
  }
  q.addEventListener('input', run);
  q.addEventListener('focus', () => { load(); if (q.value) run(); });
  q.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((a, i) => a.classList.toggle('sel', i === sel)); }
    if (e.key === 'Enter' && items[sel]) location.href = items[sel].href;
    if (e.key === 'Escape') { q.blur(); box.classList.remove('open'); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) box.classList.remove('open'); });
  const top = document.querySelector('.top');
  const openSearch = () => { top.classList.add('searching'); q.focus(); };
  document.getElementById('sbtn').addEventListener('click', openSearch);
  q.addEventListener('blur', () => setTimeout(() => { if (!q.value) top.classList.remove('searching'); }, 150));
  document.addEventListener('keydown', e => {
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !e.target.closest('input,textarea'))) { e.preventDefault(); openSearch(); }
  });
})();
