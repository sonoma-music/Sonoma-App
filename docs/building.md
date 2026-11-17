---
title: Building from source
order: 9
---
# Building from source

## Requirements

- [Node.js](https://nodejs.org) 20 or newer (comes with npm)
- Git
- Windows 10/11 or Linux (macOS should work but isn't tested)

## Run in development

```bash
git clone https://github.com/sonoma-music/Sonoma-App.git
cd Sonoma-App
npm install
npm start
```

Changes to files in `app/renderer/` show up after reloading the window (Ctrl + R). Changes to `main.js`, `preload.js` or `services.js` need a restart.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Runs the app |
| `npm run server` | Runs the listening-room server on `ws://localhost:8787` (`PORT` to change) |
| `npm run dist:win` | Builds `release/Sonoma-Setup-<version>.exe` (NSIS installer, x64) |
| `npm run dist:linux` | Builds `release/Sonoma-<version>-linux-x64.tar.gz` |
| `npm run docs` | Builds this documentation into `docs-site/` |

## Development helpers

- **UI preview in a browser:** `node dev/serve.js`, then open http://localhost:5178. The real UI runs with demo data from `dev/mock.js`. Add `?album`, `?home`, `?library`, `?get` to open a screen.
- **Smoke test:** `npx electron dev/smoke.js` starts the real app, prints renderer errors and crashes, opens Get music and quits.
- **Screenshots:** `dev/shot.sh <url> <file.png> [width] [height]` uses headless Chrome.

## Packaging notes

- Packaging uses [electron-builder](https://www.electron.build); its settings are the `build` key in `package.json`. The icon is `build/icon.png` / `build/icon.ico`.
- On Windows, if electron-builder fails with *Cannot create symbolic link* while unpacking `winCodeSign`, either enable Windows Developer Mode or extract the archive manually into `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`.
- Installers aren't code-signed. Add your certificate through electron-builder's `CSC_LINK` / `CSC_KEY_PASSWORD` environment variables to sign them.
- AppImage and .deb builds need to run on Linux.

## Website and docs

- `landing/index.html` is the website at trysonoma.xyz (one self-contained file plus `landing/images/`).
- `docs/*.md` is this documentation. `tools/build-docs.js` turns it into `docs-site/`.
- `deploy/deploy.sh` publishes the website and installers; `deploy/docs.sh` publishes the docs. Both use SSH to a server running Caddy.
