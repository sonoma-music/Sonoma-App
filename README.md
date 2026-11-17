<p align="center">
  <img src="build/icon.png" width="96" height="96" alt="Sonoma logo">
</p>

<h1 align="center">Sonoma</h1>

<p align="center">
  A free, open-source desktop music player with word-synced lyrics, playlist import,<br>
  listening rooms and a legal way to build a lossless library.
</p>

<p align="center">
  <a href="https://trysonoma.xyz">Website</a> ·
  <a href="https://docs.trysonoma.xyz">Documentation</a> ·
  <a href="https://github.com/sonoma-music/Sonoma-App">GitHub</a> ·
  <a href="https://trysonoma.xyz/download/Sonoma-Setup-0.1.0.exe">Download for Windows</a> ·
  <a href="https://trysonoma.xyz/download/Sonoma-0.1.0-linux-x64.tar.gz">Download for Linux</a>
</p>

---

## What it does

- **Plays your own library.** Point Sonoma at a folder of MP3, FLAC, M4A, OGG, Opus or WAV files. It reads the tags and cover art and builds albums for you.
- **Word-synced lyrics.** Uses a `.lrc` file next to the song first, then looks the song up on [LRCLIB](https://lrclib.net). Lines and words light up as the song plays.
- **Playlist import.** Bring playlists from Spotify (with your own free API keys), M3U/M3U8 files or a plain "Artist - Title" list. Songs are matched against your library.
- **Smart links.** Share a song or playlist as a `sonoma://` link that opens straight in Sonoma.
- **Listening rooms.** Host a room, share the code, and everyone hears the same second of the same song, with chat. Run the room server yourself with one command.
- **Get music (legal sources only).** Paste a link from Spotify, Apple Music, YouTube, Deezer, Tidal or SoundCloud. Sonoma tells you where to buy the lossless file, finds free and legal copies (Internet Archive, Jamendo), downloads them in a queue, and writes tags, cover art and lyrics into every file. Also: fix metadata from MusicBrainz, rip CDs to FLAC (Linux) and auto-import from watch folders.
- **Private by default.** No account, no ads, no telemetry unless you opt in.

Sonoma never downloads from streaming services. It only uses sources that allow downloading and links to stores for everything else.

## Download

| Platform | File |
|---|---|
| Windows 10 / 11 (x64) | [`Sonoma-Setup-0.1.0.exe`](https://trysonoma.xyz/download/Sonoma-Setup-0.1.0.exe) |
| Linux (x64) | [`Sonoma-0.1.0-linux-x64.tar.gz`](https://trysonoma.xyz/download/Sonoma-0.1.0-linux-x64.tar.gz) — extract and run `./sonoma` |

The Windows installer is not code-signed yet, so SmartScreen may warn you. Choose **More info → Run anyway**, or build it yourself from source.

## Run from source

You need [Node.js](https://nodejs.org) 20 or newer and Git.

```bash
git clone https://github.com/sonoma-music/Sonoma-App.git
cd Sonoma-App
npm install
npm start
```

Optional room server for listening rooms:

```bash
npm run server        # ws://localhost:8787, set PORT to change it
```

Build installers:

```bash
npm run dist:win      # release/Sonoma-Setup-<version>.exe
npm run dist:linux    # release/Sonoma-<version>-linux-x64.tar.gz
```

## Project layout

```
app/
  main.js          Electron main process: window, library scanning, IPC handlers
  preload.js       The window.sonoma API the UI is allowed to call
  services.js      Get music: link lookup, legal sources, download queue, metadata, CD rip, watch folders
  renderer/        The UI (plain HTML, CSS and JavaScript, no framework)
    index.html
    styles.css
    renderer.js    Library, player, playlists, lyrics, import, rooms, profile, settings
    get.js         The Get music screens
    lyrics.js      LRC parsing and lyric lookup
    fonts/         Inter (SIL Open Font License)
server/server.js   WebSocket server for listening rooms
landing/           Website at trysonoma.xyz (single HTML file)
docs/              Documentation (Markdown), published at docs.trysonoma.xyz
tools/build-docs.js  Turns docs/ into the documentation website
deploy/            Scripts that publish the website and docs to a server
dev/               Development helpers (UI preview with demo data, smoke test)
build/             App icon used by the installers
```

## Documentation

Start here, then read what you need:

1. [Introduction](docs/index.md)
2. [Getting started](docs/getting-started.md)
3. Using Sonoma: [library & playback](docs/library.md), [lyrics](docs/lyrics.md), [import & smart links](docs/import.md), [listening rooms](docs/rooms.md), [Get music](docs/get-music.md)
4. For developers: [architecture](docs/architecture.md), [building from source](docs/building.md), [room server protocol](docs/room-server.md)
5. [Privacy](docs/privacy.md), [FAQ & troubleshooting](docs/faq.md)

## Contributing

Bug reports, ideas and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security problems go to [SECURITY.md](SECURITY.md), not public issues.

## Credits

Sonoma uses [Electron](https://www.electronjs.org), [music-metadata](https://github.com/borewit/music-metadata), [node-taglib-sharp](https://github.com/benrr101/node-taglib-sharp), [ws](https://github.com/websockets/ws) and the [Inter](https://rsms.me/inter/) typeface, and data from [LRCLIB](https://lrclib.net), [MusicBrainz](https://musicbrainz.org), [Cover Art Archive](https://coverartarchive.org), [Internet Archive](https://archive.org) and [Jamendo](https://www.jamendo.com).

## License

[MIT](LICENSE). Use it, change it, share it.
