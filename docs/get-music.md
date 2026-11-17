---
title: Get music
order: 7
---
# Get music

Build a lossless library the legal way. Open **Get music** (download icon in the sidebar).

> Sonoma never downloads from streaming services and never bypasses DRM. It only downloads from sources that allow it, and links you to stores for everything else.

## First: choose a download folder

Open **Get music → Sources & folders → Download folder → Choose…**. Downloads and CD rips are saved there as:

```
<download folder>/<Artist>/<Album>/01 Title.flac
```

## Paste a link

Paste a song or album link from Spotify, Apple Music, YouTube or YouTube Music, Deezer, Tidal or SoundCloud and click **Find**. Sonoma shows:

- the song, artist and cover, and whether it's **already in your library** (with a Play button);
- **Free & legal**: searches your enabled sources for a downloadable copy;
- **Buy the FLAC**: opens a search on Qobuz, Bandcamp, 7digital or HDtracks;
- **Listen elsewhere**: the same search on other services.

## Free & legal sources

Search by artist, album or song. Results are grouped by source; open one to see its tracks, format and licence, then **Download all** or download single tracks.

| Source | What's there | Setup |
|---|---|---|
| Internet Archive | Live concerts recorded with the artist's permission (etree), public domain and Creative Commons audio. Often FLAC. | On by default |
| Jamendo | Independent artists publishing under Creative Commons. FLAC or MP3. | Free client ID from [devportal.jamendo.com](https://devportal.jamendo.com) |

Turn sources on or off under **Sources & folders**. Please respect each item's licence; many Creative Commons licences don't allow commercial use.

## Downloads

The **Downloads** tab is the queue. It shows progress, lets you cancel or retry, and clears finished items. Up to 4 downloads run at once (set under **Sources & folders**). If a source asks Sonoma to slow down, the queue waits a minute and continues.

When a file finishes, Sonoma writes **title, artist, album, year, track number, licence, cover art and lyrics** into it, saves a `.lrc` file when synced lyrics exist, and adds the song to your library.

## Fix metadata

For songs that are already in your library:

- Right-click a song → **Fix metadata…**. Pick the right match from MusicBrainz. Sonoma writes the tags, the cover from Cover Art Archive and lyrics from LRCLIB into the file.
- Album **⋯** menu → **Fix metadata for album** fixes every track using the best match.

This changes the tags inside your files, so keep a backup of anything precious.

## Playlists

Playlists show a **Missing from your library** section. **Check availability** looks for a free legal copy of each missing song; the ones it finds can be downloaded with one click (**Download N free**). For the rest, each song's menu offers **Buy lossless**.

## Rip a CD

On Linux, insert an audio CD and open **Rip a CD → Read disc**. Sonoma looks the disc up on MusicBrainz, then **Rip to FLAC** saves tagged FLAC files with cover art. It needs two programs:

```bash
sudo apt install cdparanoia flac
```

On Windows, rip with a free tool such as Exact Audio Copy or fre:ac into a watch folder (below) and Sonoma imports the files automatically.

## Watch folders

Under **Sources & folders → Watch folders**, add folders to watch, for example the folder your Bandcamp or Qobuz purchases download into. New audio files that appear there are added to your library as soon as they finish copying.
