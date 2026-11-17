---
title: Lyrics
order: 4
---
# Lyrics

Open the lyrics panel with the microphone button in the player bar.

## Where lyrics come from

1. **A .lrc file next to the song.** For `Music/Song.flac`, Sonoma looks for `Music/Song.lrc`.
2. **LRCLIB.** If there's no local file, Sonoma asks [lrclib.net](https://lrclib.net) using the title, artist, album and duration, then falls back to a search by title and artist.

Songs downloaded through [Get music](get-music.md) get a `.lrc` file automatically when synced lyrics exist.

## Synced, word-synced and plain

- **Synced** lyrics (`[01:23.45] line`) scroll and highlight line by line. Click a line to jump there.
- **Word-synced** lyrics use enhanced LRC (`<01:23.45>word`) and light up word by word. When a file only has line timings, Sonoma spreads the words across the line so they still light up.
- **Plain** lyrics are shown without timing.

## Writing your own .lrc

```
[00:12.00]First line of the song
[00:17.50]<00:17.50>Second <00:18.10>line <00:18.60>word <00:19.00>by <00:19.40>word
```

Save it with the same name as the audio file and `.lrc` as the extension.
