// Sonoma listening-room server. Run: npm run server  (PORT env, default 8787)
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8787;
const MAX_MEMBERS = 20;
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map(); // code -> { host, members:Set<ws>, state }

const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify({ ...msg, serverTime: Date.now() })); };
const broadcast = (room, msg, except) => room.members.forEach(m => m !== except && send(m, msg));
const memberList = room => [...room.members].map(m => ({ id: m.id, profile: m.profile, host: m === room.host }));

let nextId = 1;
wss.on('connection', ws => {
  ws.id = nextId++;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'ping') return send(ws, { type: 'pong', t: msg.t });

    if (msg.type === 'join') {
      const code = String(msg.room || '').toUpperCase().slice(0, 16);
      if (!code) return send(ws, { type: 'error', message: 'Room code required' });
      let room = rooms.get(code);
      if (!room) { room = { host: ws, members: new Set(), state: null }; rooms.set(code, room); }
      if (room.members.size >= MAX_MEMBERS) return send(ws, { type: 'error', message: 'Room is full' });
      ws.room = code;
      ws.profile = { name: String(msg.profile?.name || 'Guest').slice(0, 32), color: msg.profile?.color || '#e0623a', avatar: msg.profile?.avatar || '' };
      room.members.add(ws);
      send(ws, { type: 'joined', room: code, you: ws.id, host: room.host === ws, state: room.state });
      broadcast(room, { type: 'members', members: memberList(room) });
      return;
    }

    const room = rooms.get(ws.room);
    if (!room) return;

    if (msg.type === 'state' && room.host === ws) {
      // state: { track:{title,artist,duration}, playing, position }
      room.state = { track: msg.track || null, playing: !!msg.playing, position: Number(msg.position) || 0, updatedAt: Date.now() };
      broadcast(room, { type: 'state', state: room.state }, ws);
    } else if (msg.type === 'chat') {
      broadcast(room, { type: 'chat', from: ws.profile, text: String(msg.text || '').slice(0, 500) });
    } else if (msg.type === 'sync') {
      send(ws, { type: 'state', state: room.state });
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.room);
    if (!room) return;
    room.members.delete(ws);
    if (!room.members.size) return rooms.delete(ws.room);
    if (room.host === ws) {
      room.host = room.members.values().next().value;
      send(room.host, { type: 'promoted' });
    }
    broadcast(room, { type: 'members', members: memberList(room) });
  });
});

console.log(`Sonoma room server listening on ws://localhost:${PORT}`);
