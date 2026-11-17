---
title: Architecture
order: 8
---
# Architecture

Sonoma is an [Electron](https://www.electronjs.org) app with no front-end framework and no build step for the app itself. If you know HTML, CSS, JavaScript and a little Node.js, you can read all of it.

## The three layers

```
┌──────────────────────────── renderer (UI) ────────────────────────────┐
│ app/renderer/index.html  styles.css  renderer.js  get.js  lyrics.js  │
│ Runs isolated (contextIsolation). Talks to Node only via window.sonoma │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ ipcRenderer.invoke / events
┌───────────────────── app/preload.js (bridge) ─────────────────────────┐
│ contextBridge.exposeInMainWorld('sonoma', { … })                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ ipcMain.handle
┌────────────────────── main process (Node.js) ─────────────────────────┐
│ app/main.js      window, settings file, library scan, M3U, Spotify,   │
│                  media protocol, IPC handlers                          │
│ app/services.js  Get music: link lookup, sources, download queue,      │
│                  MusicBrainz / Cover Art / LRCLIB, tag writing,        │
│                  CD ripping, watch folders                             │
└────────────────────────────────────────────────────────────────────────┘
```

The renderer never touches the file system or makes cross-site requests itself (except LRCLIB for lyrics, allowed in the Content Security Policy). Everything else goes through `window.sonoma`.

## Files

| File | Responsibility |
|---|---|
| `app/main.js` | Creates the frameless window, stores settings in `sonoma.json`, scans folders with `music-metadata`, serves audio through the `sonoma-media://` protocol, handles `sonoma://` smart links and registers every IPC handler. |
| `app/preload.js` | The whole API the UI may use. If it's not here, the UI can't do it. |
| `app/services.js` | Network and file work for Get music. Providers (Internet Archive, Jamendo) live in the `providers` object. |
| `app/renderer/renderer.js` | State (`S`), player (`P`), views (`vHome`, `vAlbum`, …), lists and menus, lyrics panel, rooms, profile, settings. |
| `app/renderer/get.js` | Adds the Get music view and hooks into song menus, playlists and albums. |
| `app/renderer/lyrics.js` | LRC parsing (including word timings) and lyric lookup. |
| `server/server.js` | Listening-room WebSocket server. |

## State and saving

The renderer keeps everything in one object, `S`:

```js
{ library: [Track], playlists: [{ id, name, items: [{ trackId, title, artist }] }],
  favorites: [trackId], profile: { name, avatar, color, bio },
  settings: { roomServer, spotifyId, spotifySecret, downloadDir, watchFolders, sources, concurrency, … } }
```

`save()` debounces writes and sends `S` to the main process, which writes `sonoma.json`. A `Track` is `{ id, path, title, artist, album, albumArtist, year, trackNo, duration, cover }`, where `id` is the file path and `cover` is a small data URL.

## Views

`render()` looks up the current view in `VIEWS`. Extra screens register in `VIEWS_EXTRA` (that's how `get.js` adds **Get music** without editing `renderer.js`). Navigate with `go(view, arg)`.

## IPC API (window.sonoma)

| Group | Methods |
|---|---|
| Settings | `getStore`, `setStore` |
| Library | `pickLibrary`, `onLibraryProgress`, `localLyrics`, `mediaUrl`, `onAdded` |
| Import | `importM3U`, `importSpotify`, `onOpenLink` |
| Get music | `resolveLink`, `buyLinks`, `providers`, `searchSources`, `sourceTracks`, `findFree` |
| Downloads | `dlAdd`, `dlList`, `dlCancel`, `dlRetry`, `dlClear`, `onDl` |
| Metadata | `metaLookup`, `metaApply` |
| CD & folders | `cdInfo`, `cdRip`, `onCd`, `setWatch`, `pickFolder`, `openPath` |
| Window & misc | `winMin`, `winMax`, `winClose`, `copy`, `openExternal` |

## Download pipeline

1. A source's `tracks()` returns direct file URLs plus metadata and licence.
2. `createQueue().add()` queues them; up to `settings.concurrency` run at once.
3. Each job streams to `<file>.part`, renames it, then fetches cover art and lyrics.
4. `writeTags()` (node-taglib-sharp) writes the tags; a `.lrc` file is saved for synced lyrics.
5. `readTags()` re-reads the file and the `library:added` event adds it to the UI.

## Being a good API citizen

All third-party requests send `User-Agent: Sonoma/<version> ( https://trysonoma.xyz )`. MusicBrainz requests are spaced at least 1.1 s apart and retried when the server is busy.
