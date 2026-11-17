---
title: Privacy
order: 11
---
# Privacy

Sonoma has no account, no ads and no analytics. Your library, playlists and settings stay in one file on your computer (`sonoma.json`, see [Library](library.md)).

## Every network request Sonoma makes

Sonoma only goes online for a feature you use. This is the complete list:

| When | Who | What is sent |
|---|---|---|
| Showing lyrics for a song | lrclib.net | Song title, artist, album, duration |
| Importing a Spotify playlist | accounts.spotify.com, api.spotify.com | Your own app keys and the playlist ID |
| Joining a listening room | The room server you chose | Your profile name, avatar and colour, what you play, chat messages |
| Pasting a link in Get music | The site of that link (e.g. open.spotify.com, youtube.com, api.deezer.com, itunes.apple.com, soundcloud.com, tidal.com) | The link itself |
| Searching or downloading free sources | archive.org, api.jamendo.com (with your client ID) | Your search words, the files you download |
| Writing metadata | musicbrainz.org, coverartarchive.org, lrclib.net | Song title, artist, album |
| Showing cover images in Get music | The image's host | A normal image request |

Store buttons (Qobuz, Bandcamp, 7digital, HDtracks) and "Listen elsewhere" open in your web browser; Sonoma doesn't contact those sites itself.

## Crash reports

The "Share anonymous crash reports" switch in Settings is off by default. No crash reporting is built in yet, so nothing is sent either way.

## Keys and secrets

Spotify and Jamendo keys are stored in plain text in `sonoma.json`. Anyone with access to your user account can read them.

## The website and docs

trysonoma.xyz and docs.trysonoma.xyz are static pages with no cookies, no analytics and no trackers. Fonts load from Google Fonts.
