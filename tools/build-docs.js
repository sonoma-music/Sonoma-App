// Builds docs/*.md into a static website in docs-site/ (published at docs.trysonoma.xyz).
// Usage: npm run docs
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const SRC = path.join(__dirname, '..', 'docs');
const OUT = path.join(__dirname, '..', 'docs-site');
const SITE = 'https://docs.trysonoma.xyz';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const decode = s => String(s).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

// ---------- read pages ----------
const pages = fs.readdirSync(SRC).filter(f => f.endsWith('.md')).map(file => {
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (m) m[1].split('\n').forEach(l => { const [k, ...v] = l.split(':'); meta[k.trim()] = v.join(':').trim(); });
  const body = m ? raw.slice(m[0].length) : raw;
  const slug = file.replace(/\.md$/, '');
  return { file, slug, out: slug === 'index' ? 'index.html' : `${slug}.html`, title: meta.title || slug, order: +meta.order || 99, body };
}).sort((a, b) => a.order - b.order);

const GROUPS = [
  ['Start here', ['index', 'getting-started']],
  ['Using Sonoma', ['library', 'lyrics', 'import', 'rooms', 'get-music']],
  ['Developers', ['architecture', 'building', 'room-server']],
  ['More', ['privacy', 'faq']]
];


// 16px line icons for the sidebar and the overview cards
const I = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  index: I('<path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5zM4 19.5A2 2 0 0 1 6 18h12"/>'),
  'getting-started': I('<path d="M5 13l4 4L19 7"/>'),
  library: I('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  lyrics: I('<path d="M4 6h16M4 12h10M4 18h7"/>'),
  import: I('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  rooms: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-4-5.6"/>'),
  'get-music': I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>'),
  architecture: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  building: I('<path d="m14.7 6.3 3-3a4 4 0 0 1-5.4 5.4L6 15l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4l-3 3"/>'),
  'room-server': I('<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>'),
  privacy: I('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>'),
  faq: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01"/>')
};
const DESCS = {
  'getting-started': 'Install Sonoma and add your music in two minutes.',
  library: 'How the library is built, albums, playlists and playback.',
  lyrics: 'Synced, word-synced and plain lyrics, and writing your own .lrc.',
  import: 'Bring playlists from Spotify, M3U files or a plain list.',
  rooms: 'Listen to the same song at the same second with friends.',
  'get-music': 'Build a lossless library from legal sources.',
  architecture: 'Main process, preload bridge, renderer and services.',
  building: 'Run from source, build installers, dev helpers.',
  'room-server': 'Run the WebSocket server and its message protocol.',
  privacy: 'Every network request Sonoma makes, and why.',
  faq: 'Answers to common questions and fixes for common problems.'
};
const groupOf = slug => (GROUPS.find(([, s]) => s.includes(slug)) || ['Docs'])[0];

// ---------- markdown -> html ----------
function render(page) {
  const toc = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2) toc.push({ id, text });
    if (depth === 1) return `<h1>${text}</h1>`;
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${text}</h${depth}>`;
  };
  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    let h = href;
    const ext = /^https?:/.test(h);
    if (!ext) h = h.replace(/^(\.\/)?index\.md(#|$)/, '/$2').replace(/^(\.\/)?([\w-]+)\.md(#|$)/, '/$2$3');
    return `<a href="${esc(h)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
  };
  renderer.code = ({ text, lang }) => `<div class="code"><div class="code-h"><span>${esc({ bash: 'Terminal', ini: 'systemd', js: 'JavaScript', '': 'Text' }[lang || ''] || lang)}</span><button class="copy" type="button" aria-label="Copy code">Copy</button></div><pre><code>${esc(text)}</code></pre></div>`;
  renderer.table = function (token) {
    const head = token.header.map(c => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('');
    const rows = token.rows.map(r => `<tr>${r.map(c => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
    return `<div class="tbl"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  const html = marked.parse(page.body, { renderer, gfm: true });
  return { html, toc };
}

// ---------- page template ----------
const LOGO = '<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><rect x="5" y="14" width="7" height="16" rx="3.5"/><rect x="16.5" y="6" width="7" height="28" rx="3.5"/><rect x="28" y="11" width="7" height="13" rx="3.5"/></svg>';
function layout(page, html, toc, prev, next) {
  const desc = (page.body.match(/^(?!#|>|\||-|\d\.|```)(.{40,})$/m) || [, ''])[1].replace(/[*`[\]]/g, '').replace(/\(.*?\)/g, '').slice(0, 155);
  const url = p => p.out === 'index.html' ? '/' : '/' + p.out.replace(/\.html$/, '');
  const side = GROUPS.map(([g, slugs]) => `<div class="grp"><h6>${g}</h6>${slugs.map(s => pages.find(p => p.slug === s)).filter(Boolean).map(p => `<a href="${url(p)}"${p === page ? ' class="on" aria-current="page"' : ''}>${ICONS[p.slug] || ''}<span>${esc(p.title)}</span></a>`).join('')}</div>`).join('');
  const cards = page.slug === 'index' ? `<div class="cards">${pages.filter(p => p.slug !== 'index').map(p => `<a class="cardlink" href="${url(p)}"><i>${ICONS[p.slug] || ''}</i><b>${esc(p.title)}</b><span>${esc(DESCS[p.slug] || '')}</span></a>`).join('')}</div>` : '';
  const eyebrow = page.slug ? `<div class="eyebrow">${esc(groupOf(page.slug))}</div>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — Sonoma Docs</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${page.out === 'index.html' ? '' : page.out.replace(/\.html$/, '')}">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/docs.css">
</head>
<body>
<header class="top">
  <button class="menu" id="menu" aria-label="Open navigation"><span></span><span></span></button>
  <a class="brand" href="/">${LOGO}<b>Sonoma</b><em>Docs</em></a>
  <button class="search-btn" id="sbtn" aria-label="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
  <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" placeholder="Search docs" autocomplete="off"><kbd>Ctrl K</kbd><div class="results" id="results"></div></label>
  <nav class="links"><a href="https://trysonoma.xyz">Website</a><a href="https://github.com/sonoma-music/Sonoma-App">GitHub</a><a class="dl" href="https://trysonoma.xyz/download/Sonoma-Setup-0.1.0.exe">Download</a></nav>
</header>
<div class="glow" aria-hidden="true"></div>
<div class="shell">
  <aside class="side" id="side">${side}</aside>
  <main class="doc">
    <article>${eyebrow}${cards ? html.replace(/(<\/p>)/, '$1' + cards) : html}</article>
    <nav class="pager">${prev ? `<a class="prev" href="${url(prev)}"><small>← Previous</small>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next" href="${url(next)}"><small>Next →</small>${esc(next.title)}</a>` : '<span></span>'}</nav>
    <footer class="foot"><span>© 2026 Sonoma · MIT licence</span><span>${page.file ? `<a href="https://github.com/sonoma-music/Sonoma-App/edit/main/docs/${page.file}">Edit this page</a> · ` : ''}<a href="https://trysonoma.xyz">trysonoma.xyz</a></span></footer>
  </main>
  <aside class="toc">${toc.length ? `<h6><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h12M4 18h8"/></svg>On this page</h6>${toc.map(t => `<a href="#${t.id}">${t.text}</a>`).join('')}` : ''}</aside>
</div>
<script src="/docs.js"></script>
</body>
</html>
`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = [];
pages.forEach((p, i) => {
  const { html, toc } = render(p);
  fs.writeFileSync(path.join(OUT, p.out), layout(p, html, toc, pages[i - 1], pages[i + 1]));
  const text = decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  index.push({ t: p.title, u: p.out === 'index.html' ? '/' : '/' + p.out.replace(/\.html$/, ''), h: toc.map(x => [decode(x.text), x.id]), x: text.slice(0, 6000) });
});
fs.writeFileSync(path.join(OUT, 'search.json'), JSON.stringify(index));
for (const f of ['docs.css', 'docs.js']) fs.copyFileSync(path.join(__dirname, 'docs-assets', f), path.join(OUT, f));
fs.copyFileSync(path.join(__dirname, '..', 'build', 'icon.png'), path.join(OUT, 'favicon.png'));
fs.writeFileSync(path.join(OUT, '404.html'), layout({ title: 'Page not found', body: '', out: '404.html', slug: '' }, '<h1>Page not found</h1><p>That page doesn\'t exist. Try the search above or go back to the <a href="/">introduction</a>.</p>', [], null, null));
console.log(`Built ${pages.length} pages into ${path.relative(process.cwd(), OUT) || OUT}`);
