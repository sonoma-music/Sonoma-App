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
  renderer.code = ({ text, lang }) => `<div class="code"><span class="lang">${esc(lang || 'text')}</span><button class="copy" type="button" aria-label="Copy code">Copy</button><pre><code>${esc(text)}</code></pre></div>`;
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
  const side = GROUPS.map(([g, slugs]) => `<div class="grp"><h6>${g}</h6>${slugs.map(s => pages.find(p => p.slug === s)).filter(Boolean).map(p => `<a href="${url(p)}"${p === page ? ' class="on" aria-current="page"' : ''}>${esc(p.title)}</a>`).join('')}</div>`).join('');
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
  <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" placeholder="Search docs" autocomplete="off"><kbd>/</kbd><div class="results" id="results"></div></label>
  <nav class="links"><a href="https://trysonoma.xyz">Website</a><a href="https://github.com/sonoma-music/Sonoma-App">GitHub</a><a class="dl" href="https://trysonoma.xyz/download/Sonoma-Setup-0.1.0.exe">Download</a></nav>
</header>
<div class="glow" aria-hidden="true"></div>
<div class="shell">
  <aside class="side" id="side">${side}</aside>
  <main class="doc">
    <article>${html}</article>
    <nav class="pager">${prev ? `<a class="prev" href="${url(prev)}"><small>Previous</small>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next" href="${url(next)}"><small>Next</small>${esc(next.title)}</a>` : '<span></span>'}</nav>
    <footer class="foot"><span>© 2026 Sonoma · MIT licence</span><span>${page.file ? `<a href="https://github.com/sonoma-music/Sonoma-App/edit/main/docs/${page.file}">Edit this page</a> · ` : ''}<a href="https://trysonoma.xyz">trysonoma.xyz</a></span></footer>
  </main>
  <aside class="toc">${toc.length ? `<h6>On this page</h6>${toc.map(t => `<a href="#${t.id}">${t.text}</a>`).join('')}` : ''}</aside>
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
fs.writeFileSync(path.join(OUT, '404.html'), layout({ title: 'Page not found', body: '', out: '404.html' }, '<h1>Page not found</h1><p>That page doesn\'t exist. Try the search above or go back to the <a href="/">introduction</a>.</p>', [], null, null));
console.log(`Built ${pages.length} pages into ${path.relative(process.cwd(), OUT) || OUT}`);
