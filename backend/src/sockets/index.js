import { Message, RoomMember, User } from '../models/index.js';
import authenticateSocket from './authenticateSocket.js';
import { registerConnection, removeConnection } from './onlineUsers.js';
import isUuid from '../utils/isUuid.js';

/** Loads a message back out with its author attached, for broadcasting. */
async function loadMessageWithAuthor(messageId) {
  return Message.findByPk(messageId, {
    include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
  });
}

export default function registerSocketHandlers(io) {
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const { userId } = socket;
    const { name } = socket.data.user;

    // Registered SYNCHRONOUSLY, before any `await` below.
    //
    // Socket.io fires the client's 'connect' event as soon as the server
    // accepts the handshake — which happens as part of running this handler,
    // BEFORE it hits its first await. If we called registerConnection() after
    // an await instead, there's a real window where a second tab's socket
    // is already usable client-side but hasn't been recorded here yet. Open
    // tab 2 and immediately close tab 1 inside that window, and
    // removeConnection() for tab 1 would see a set of size 1 — itself — and
    // wrongly conclude the user just went offline while tab 2 is still open.
    // Doing this first, before any async work, closes that window.
    const isFirstConnection = registerConnection(userId, socket.id);

    // Auto-subscribe this connection to every room the user already
    // belongs to. That's what lets a message posted in #random show up for
    // someone whose sidebar is currently on #general — Slack does the same.
    // `roomIds` is `let`, not `const`: room:subscribe below appends to it,
    // so a room joined mid-session is still known about at disconnect time.
    const memberships = await RoomMember.findAll({
      where: { userId },
      attributes: ['roomId'],
      raw: true,
    });
    let roomIds = memberships.map((m) => m.roomId);
    roomIds.forEach((roomId) => socket.join(roomId));

    if (isFirstConnection) {
      await User.update({ isOnline: true }, { where: { id: userId } });
      // socket.to (not io.to): everyone else in the room hears about it,
      // the user who just connected doesn't need to be told about themself.
      roomIds.forEach((roomId) => socket.to(roomId).emit('presence:online', { userId, name }));
    }

    console.log(`[socket] ${name} connected (${socket.id})`);

    /**
     * A client calls this right after a REST POST /rooms/:id/join, so this
     * same socket also starts receiving that room's live events without
     * having to reconnect. Re-checks membership in the database rather than
     * trusting the client-supplied roomId — the socket has been open for an
     * unknown length of time, so we can't assume anything claimed by the
     * client is still true.
     */
    socket.on('room:subscribe', async ({ roomId } = {}, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};

      if (!isUuid(roomId)) {
        return ack({ ok: false, error: 'Invalid room id' });
      }

      const membership = await RoomMember.findOne({ where: { userId, roomId } });
      if (!membership) {
        return ack({ ok: false, error: 'You are not a member of this room' });
      }

      socket.join(roomId);
      if (!roomIds.includes(roomId)) roomIds.push(roomId);

      return ack({ ok: true });
    });

    /**
     * The core event: persist, then broadcast.
     *
     * Persisting BEFORE broadcasting matters — if we emitted first and the
     * database write then failed, other clients would show a message that
     * doesn't exist on reload. Persist-then-broadcast keeps the database and
     * every client's view consistent with it.
     *
     * `callback` is a Socket.io acknowledgement: the client passes a
     * function as the last argument to emit(), and calling it here sends a
     * reply back down the SAME connection. That's what lets the sender's UI
     * show "sent" / "failed" instead of just hoping delivery worked.
     */
    socket.on('message:send', async ({ roomId, content } = {}, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};

      try {
        if (!isUuid(roomId)) {
          return ack({ ok: false, error: 'Invalid room id' });
        }

        // socket.rooms is maintained by Socket.io itself and only ever
        // contains rooms we explicitly joined after checking membership
        // (above, and on connect) — so this check is free, no DB hit needed.
        if (!socket.rooms.has(roomId)) {
          return ack({ ok: false, error: 'You are not subscribed to this room' });
        }

        const message = await Message.create({ content, userId, roomId });
        const withAuthor = await loadMessageWithAuthor(message.id);

        // io.to (not socket.to): the sender sees their own message arrive
        // through the same real-time path as everyone else, rather than the
        // UI faking its own optimistic copy.
        io.to(roomId).emit('message:new', withAuthor);

        return ack({ ok: true, message: withAuthor });
      } catch (error) {
        if (error.name === 'SequelizeValidationError') {
          return ack({ ok: false, error: error.errors[0].message });
        }
        console.error('[socket message:send]', error);
        return ack({ ok: false, error: 'Failed to send message' });
      }
    });

    // Typing indicators are intentionally NOT persisted — they're a live-only
    // signal with no meaning after the fact, so there's nothing to save and
    // nothing to load on history fetch.
    socket.on('typing:start', ({ roomId } = {}) => {
      if (!isUuid(roomId) || !socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('typing:start', { roomId, userId, name });
    });

    socket.on('typing:stop', ({ roomId } = {}) => {
      if (!isUuid(roomId) || !socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('typing:stop', { roomId, userId, name });
    });

    socket.on('disconnect', async () => {
      console.log(`[socket] ${name} disconnected (${socket.id})`);

      const isLastConnection = removeConnection(userId, socket.id);
      if (!isLastConnection) return; // another tab is still open — stay online

      const lastSeenAt = new Date();
      await User.update({ isOnline: false, lastSeenAt }, { where: { id: userId } });
      roomIds.forEach((roomId) => socket.to(roomId).emit('presence:offline', { userId, name, lastSeenAt }));
    });
  });
}
