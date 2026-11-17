# Contributing to Sonoma

Thanks for helping! This guide explains how to get the code running and what we look for in a change.

## Ground rules

- **Legal sources only.** Sonoma will not add features that download from streaming services (Spotify, Tidal, Qobuz streaming, Deezer, YouTube, Amazon Music, …) or that work around DRM. New download sources must allow downloading in their terms, e.g. public domain, Creative Commons, or files the user bought.
- **Privacy first.** No tracking or analytics. Network calls must be needed for a feature the user turned on, and documented in [docs/privacy.md](docs/privacy.md).
- **Keep it simple.** The UI is plain HTML, CSS and JavaScript on purpose. Please don't add a framework or a build step for the app.

## Setup

```bash
npm install
npm start             # run the app
npm run server        # optional: listening-room server on ws://localhost:8787
```

Useful while working:

- `node dev/serve.js` serves the UI at http://localhost:5178 with demo data, so you can style it in a normal browser. Add `?album`, `?home`, `?library`, `?get` to jump to a screen.
- `npx electron dev/smoke.js` starts the real app, prints renderer errors and quits.
- `npm run docs` builds the documentation site into `docs-site/`.

## Where things live

Read [docs/architecture.md](docs/architecture.md) first. In short: `app/main.js` and `app/services.js` run in Node (files, network, downloads), `app/preload.js` is the bridge, and `app/renderer/` is the UI.

## Making a change

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Create a branch from `main`.
3. Keep commits focused and write clear messages ("Add Jamendo album search", not "fix stuff").
4. Test what you touched: run the app, try the feature, and check the console for errors (`npx electron dev/smoke.js`).
5. Update the docs in `docs/` when behaviour changes.
6. Open a pull request and fill in the template.

## Code style

- 2-space indentation, semicolons, single quotes.
- Escape anything you put into HTML with `esc()`.
- Main-process code that talks to the network goes in `app/services.js`; expose it through an `ipcMain.handle` in `main.js` and a method in `preload.js`.
- Send a descriptive `User-Agent` to third-party APIs and respect their rate limits (MusicBrainz: one request per second).

## Adding a download source

Sources live in the `providers` object in `app/services.js`. Each one has:

```js
{
  id: 'example', name: 'Example', needsKey: false,
  description: 'What it offers and under which licence.',
  async search(query, cfg) { /* -> [{ key, kind: 'album'|'track', title, artist, cover, license, page }] */ },
  async tracks(item, cfg)  { /* -> [{ title, artist, album, trackNo, year, cover, url, ext, license, source }] */ }
}
```

Only add sources whose terms allow downloading, and always return the licence.

## Reporting bugs

Use the bug report template. Include your OS, Sonoma version, what you did, what you expected and what happened. Screenshots help.
