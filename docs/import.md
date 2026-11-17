---
title: Import & smart links
order: 5
---
# Import & smart links

Open **Library → Import**. Imported playlists are matched against your library by title and artist. Songs you don't have yet stay in the playlist marked "not in library", and the playlist page offers to find them (see [Get music](get-music.md)).

## Spotify playlists

Spotify requires an app key, which is free:

1. Go to [developer.spotify.com](https://developer.spotify.com/dashboard), sign in and create an app.
2. Copy its **Client ID** and **Client secret** into **Settings → Spotify import**. They're stored only on your computer.
3. Paste a public playlist link (`https://open.spotify.com/playlist/…`) and click **Import**.

## M3U / M3U8 files

Click **Choose file…** and pick a playlist exported from Winamp, foobar2000, VLC, iTunes or most other players. Relative paths are resolved from the playlist's folder.

## A plain list

Paste one song per line as `Artist - Title`. Works for anything: SoundCloud likes, a YouTube playlist you typed out, a setlist.

## Smart links

Smart links open straight in Sonoma.

| Link | What it does |
|---|---|
| `sonoma://track?t=Title&a=Artist` | Plays the song if it's in your library |
| `sonoma://playlist?d=…` | Creates the shared playlist in your library |
| `sonoma://room?c=CODE` | Joins a listening room |

Copy one from a song's menu, a playlist's **⋯** menu, or the link button in the player bar. Open one by clicking it, or paste it under **Import → Open a smart link**.
