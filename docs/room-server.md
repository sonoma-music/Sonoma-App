---
title: Room server
order: 10
---
# Room server

Listening rooms need a small WebSocket server that relays "what's playing" between people. It's `server/server.js`, about 60 lines, with no database.

## Run it

```bash
npm install
npm run server            # ws://localhost:8787
PORT=9000 npm run server  # another port
```

Point Sonoma at it under **Settings → Listening rooms** (for friends on the internet, use your public address, e.g. `wss://rooms.example.com`).

## Running it publicly

Put it behind a reverse proxy that adds TLS, so clients can use `wss://`. With Caddy:

```
rooms.example.com {
	reverse_proxy 127.0.0.1:8787
}
```

Keep it running with systemd (`/etc/systemd/system/sonoma-rooms.service`):

```ini
[Unit]
Description=Sonoma listening rooms
After=network.target

[Service]
WorkingDirectory=/opt/sonoma
ExecStart=/usr/bin/node server/server.js
Environment=PORT=8787
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

The server has no accounts: anyone who knows a room code can join.

## Protocol

All messages are JSON. The server adds `serverTime` (ms since epoch) to everything it sends.

### Client → server

| type | Fields | Meaning |
|---|---|---|
| `join` | `room`, `profile: { name, avatar, color }` | Join or create a room (code is upper-cased, max 16 chars). The first person becomes host. |
| `state` | `track: { title, artist, duration }`, `playing`, `position` | Host only: what's playing and where. |
| `chat` | `text` | Chat message (max 500 chars). |
| `sync` | — | Ask for the current state again. |
| `ping` | `t` | Clock check; answered with `pong`. |

### Server → client

| type | Fields | Meaning |
|---|---|---|
| `joined` | `room`, `you`, `host`, `state` | You're in. `host` tells you if you're the host. |
| `members` | `members: [{ id, profile, host }]` | Sent whenever someone joins or leaves. |
| `state` | `state: { track, playing, position, updatedAt }` | The host's playback. |
| `chat` | `from`, `text` | A chat message. |
| `promoted` | — | The host left and you're the new host. |
| `pong` | `t` | Reply to `ping`; use `serverTime` to estimate clock offset. |
| `error` | `message` | E.g. "Room is full" (20 people max). |

### Staying in sync

Clients estimate the clock offset from `ping`/`pong`, then compute where the host is right now:

```
expected = position + (playing ? (now + offset - updatedAt) / 1000 : 0)
```

and seek when they drift more than 0.6 s. The host re-sends its state every 5 seconds while playing.
