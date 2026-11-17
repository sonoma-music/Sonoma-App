// Dev-only: starts the real app, reports renderer errors/crashes, quits after a few seconds.
// Usage: npx electron dev/smoke.js
const { app } = require('electron');
app.on('web-contents-created', (_e, wc) => {
  wc.on('console-message', (_ev, level, msg, line, src) => { if (level >= 2) console.log('[renderer]', msg, src + ':' + line); });
  wc.on('render-process-gone', (_ev, d) => console.log('[gone]', JSON.stringify(d)));
  wc.on('did-finish-load', () => setTimeout(async () => {
    const r = await wc.executeJavaScript(`({ view, nav: [...document.querySelectorAll('#nav button')].map(b => b.dataset.view), get: typeof VIEWS_EXTRA.get })`).catch(e => e.message);
    console.log('[loaded]', JSON.stringify(r));
    await wc.executeJavaScript(`go('get')`).catch(e => console.log('[go get failed]', e.message));
    setTimeout(() => { console.log('[ok] quitting'); app.quit(); }, 2500);
  }, 2500));
});
require('../app/main.js');
