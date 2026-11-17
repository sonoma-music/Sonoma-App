---
title: FAQ & troubleshooting
order: 12
---
# FAQ & troubleshooting

## Is Sonoma really free?

Yes. Every feature is free, with no ads, no paid plans and no account. It's open source under the MIT licence.

## Can Sonoma download from Spotify, Tidal, Deezer or YouTube?

No, and it won't. Downloading from streaming services breaks their terms and the artists' rights. Sonoma identifies the song from your link, shows stores where you can buy the lossless file, and finds free copies only on sources that allow downloading.

## Windows says "Windows protected your PC"

The installer isn't code-signed yet. Click **More info → Run anyway**, or build Sonoma yourself from source.

## Some songs show "Unknown artist" or no cover

The files have no tags. Right-click the song → **Fix metadata…**, or use the album's **⋯** → **Fix metadata for album**.

## No lyrics for a song

LRCLIB doesn't have it. Put a `.lrc` file with the same name next to the audio file (see [Lyrics](lyrics.md)).

## "Could not reach the room server"

The address under **Settings → Listening rooms** isn't running or isn't reachable. Start one with `npm run server` or ask whoever hosts yours.

## Spotify import says the keys were rejected

Check the Client ID and secret under **Settings → Spotify import**, and that the app still exists in your Spotify developer dashboard. Private playlists can't be imported with app keys.

## Downloads say "Choose a download folder"

Set one under **Get music → Sources & folders → Download folder**.

## Jamendo shows no results

Add your free client ID under **Get music → Sources & folders → Jamendo**.

## CD ripping isn't available

It works on Linux with `cdparanoia` and `flac` installed. On Windows, rip with Exact Audio Copy or fre:ac into a watch folder.

## Where are my settings stored?

`%APPDATA%\sonoma\sonoma.json` on Windows and `~/.config/sonoma/sonoma.json` on Linux. Delete it to reset Sonoma (your music files are not touched).

## How do I report a bug or ask for a feature?

Open an issue on GitHub using the templates. For security problems, see `SECURITY.md` in the repository.
