---
title: Listening rooms
order: 6
---
# Listening rooms

Listen to the same song at the same moment with friends, wherever they are, and chat while you listen.

## Before you start

- Everyone needs the songs in their own library. Rooms share *what* is playing and *where*, never the audio itself. If someone is missing a song, Sonoma tells them which one.
- You need a room server. Sonoma uses `ws://localhost:8787` by default; change it under **Settings → Listening rooms**. Run one yourself with `npm run server` (see [room server](room-server.md)), or use a friend's.

## Host a room

1. Open **Rooms** and click **Create room**. You get a code like `SUN-42` and become the host.
2. Click **Invite link** and send the `sonoma://room?c=…` link, or just share the code.
3. Play anything. Play, pause, seek and song changes are sent to the room.

## Join a room

Click an invite link, or open **Rooms**, type the code and click **Join**. Sonoma finds the host's song in your library, jumps to the right position and keeps you in sync.

## Good to know

- Up to 20 people per room.
- If the host leaves, the next person becomes host automatically.
- Clocks are compared with the server, so small network delays don't put you out of sync.
- The room server has no passwords: anyone with the code can join.
