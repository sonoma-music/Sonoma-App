---
title: Getting started
order: 2
---
# Getting started

Download Sonoma for your device, install it, and add your music. Everything is free and comes from the same open-source code.

## Download

| Device | File | Notes |
|---|---|---|
| Windows 10 / 11 | [Sonoma-Setup.exe](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-Setup.exe) | x64 |
| Mac with Apple Silicon (M1–M4) | [Sonoma-mac-arm64.dmg](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-mac-arm64.dmg) | macOS 11 or newer |
| Mac with Intel | [Sonoma-mac-x64.dmg](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-mac-x64.dmg) | macOS 10.15 or newer |
| Linux | [Sonoma-linux-x64.AppImage](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-linux-x64.AppImage) or [.tar.gz](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-linux-x64.tar.gz) | x64 |
| Android | [Sonoma-android.apk](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-android.apk) | Android 7 or newer |
| iPhone & iPad | [Sonoma-ios-unsigned.ipa](https://github.com/sonoma-music/Sonoma-App/releases/latest/download/Sonoma-ios-unsigned.ipa) | iOS 14 or newer, sideload |

All releases, with older versions and checksums, are on [GitHub Releases](https://github.com/sonoma-music/Sonoma-App/releases).

## Install

### Windows

Run `Sonoma-Setup.exe`. The installer isn't code-signed yet, so SmartScreen may warn you: choose **More info → Run anyway**.

### macOS

Open the `.dmg` and drag **Sonoma** into **Applications**. Sonoma isn't notarized by Apple yet, so the first time:

1. Right-click (or Control-click) Sonoma in Applications and choose **Open**, then **Open** again.
2. If macOS still refuses, open **System Settings → Privacy & Security** and click **Open Anyway**.

### Linux

```bash
chmod +x Sonoma-linux-x64.AppImage
./Sonoma-linux-x64.AppImage
```

Or extract the `.tar.gz` and run `./sonoma` inside it.

### Android

1. Download `Sonoma-android.apk` on your phone.
2. Open it. Android asks to allow installing apps from your browser or file manager: allow it once, then tap **Install**.

### iPhone & iPad

Apple only allows App Store apps or apps you sideload yourself. Until Sonoma is on the App Store, install the IPA with a free sideloading tool:

1. Install [AltStore](https://altstore.io) or [Sideloadly](https://sideloadly.io) on your computer.
2. Connect your iPhone, open the tool, and choose `Sonoma-ios-unsigned.ipa`.
3. Sign in with your Apple ID when asked (the tool signs the app for your device), then trust the developer under **Settings → General → VPN & Device Management**.

With a free Apple ID the app must be refreshed every 7 days; AltStore does this automatically.

## Add your music

**On a computer:** click **Add folder** on Home and pick the folder with your music. Sub-folders are included. Sonoma reads every MP3, FLAC, M4A, OGG, Opus, AAC, WebM and WAV file, with its tags and cover art, and groups the songs into albums.

**On a phone:** tap **Add folder** and choose your music files (select several at once). Sonoma copies them into the app, reads their tags and cover art, and keeps them for offline listening. Pick `.lrc` files together with the songs to bring their lyrics along.

## Find your way around

| Icon | Screen | What it's for |
|---|---|---|
| House | Home | Your playlists, albums and recently added songs |
| Magnifier | Search | Search songs, artists and albums in your library |
| Bookmarks | Library | Favorites, playlists, all songs, and Import |
| Download | Get music | Links, free legal sources, downloads, CD ripping |
| People | Rooms | Listen together with friends |
| Gear | Settings | Room server, Spotify keys, privacy, library, profile |

On a computer these are in the sidebar; on a phone they're the tab bar at the bottom. The player shows what's playing; on a phone, tap the lyrics button to open lyrics full-screen.

## Desktop vs phone

| Feature | Desktop | Phone |
|---|---|---|
| Library, playlists, lyrics, rooms, import | ✓ | ✓ |
| Get music: links, free sources, downloads | ✓ | ✓ (saved inside the app) |
| Fix metadata | Writes tags into the file | Updates the library entry |
| CD ripping, watch folders | ✓ (CD ripping on Linux) | — |

## Keyboard shortcuts (desktop)

| Keys | Action |
|---|---|
| Space | Play / pause |
| Ctrl + → | Next song |
| Ctrl + ← | Previous song (or restart the current one) |
