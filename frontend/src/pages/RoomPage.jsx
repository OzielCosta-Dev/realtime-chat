import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { getRoom, getRoomMembers } from '../api/rooms.js';
import { listMessages } from '../api/messages.js';
import extractErrorMessage from '../utils/extractErrorMessage.js';
import './RoomPage.css';

// How long to wait after the last keystroke before telling the room this
// user stopped typing. Long enough that normal typing pauses (thinking,
// glancing at a message) don't flicker the indicator off and on; short
// enough that it doesn't linger long after someone actually stops.
const TYPING_STOP_DELAY_MS = 2000;

// A safety net independent of the sender: if their typing:stop event never
// arrives (closed tab, network drop mid-type), this clears them from the
// indicator on the RECEIVING side regardless. Deliberately longer than
// TYPING_STOP_DELAY_MS so it only kicks in when something actually went
// wrong, not as the normal path.
const TYPING_EXPIRE_MS = 4000;

function formatTypingLabel(names) {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} others are typing…`;
}

export default function RoomPage() {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState(null); // null = loading, [] = loaded-empty
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [accessError, setAccessError] = useState('');

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');

  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // [{ userId, name }]

  const bottomRef = useRef(null);
  const messageListRef = useRef(null);

  // Tracks whether WE currently count as "typing" from the server's point of
  // view, so a keystroke doesn't re-emit typing:start on every character —
  // only on the transition from not-typing to typing.
  const isTypingRef = useRef(false);
  const typingStopTimerRef = useRef(null);
  // One auto-expire timer per OTHER user currently shown as typing —
  // see TYPING_EXPIRE_MS above.
  const typingExpireTimersRef = useRef(new Map());

  // --- load room metadata + members + initial message history -------------
  useEffect(() => {
    setMessages(null);
    setAccessError('');

    getRoom(roomId)
      .then(setRoom)
      .catch((err) => setAccessError(extractErrorMessage(err)));

    listMessages(roomId)
      .then((page) => {
        setMessages(page.messages);
        setHasMore(page.hasMore);
      })
      .catch((err) => setAccessError(extractErrorMessage(err)));

    getRoomMembers(roomId)
      .then((list) => {
        // We know we're online — we're the one loading this page. The
        // REST snapshot could theoretically still show us offline if it's
        // read a beat before the socket's 'connection' handler finishes
        // flipping users.is_online in the database (see backend/src/
        // sockets/index.js) — a real but narrow race, not worth a retry
        // loop for what it's protecting.
        setMembers(list.map((m) => (m.id === user?.id ? { ...m, isOnline: true } : m)));
      })
      .catch(() => {}); // member list is a nice-to-have; a failure here shouldn't block chat
  }, [roomId, user?.id]);

  // --- subscribe this socket to the room, listen for live messages --------
  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    // Idempotent on the server (see backend/src/sockets/index.js) — safe to
    // call even if this socket auto-joined the room already at connect
    // time. The one case where it's NOT redundant: joining a brand new room
    // during an already-open session, where the socket was never told about
    // it until now.
    socket.emit('room:subscribe', { roomId }, (response) => {
      if (!response?.ok) {
        setAccessError(response?.error || 'Could not subscribe to this room');
      }
    });

    // The socket stays subscribed to EVERY room the user belongs to, all at
    // once (not just the one currently open) — so this listener has to
    // filter to the room this page is showing, or a message sent in #random
    // while you're looking at #general would appear in the wrong chat.
    function handleNewMessage(message) {
      if (message.roomId !== roomId) return;
      setMessages((current) => (current ? [...current, message] : [message]));
    }

    // Presence events aren't scoped to a room server-side (the payload has
    // no roomId — see backend/src/sockets/index.js), because a user only
    // needs to know presence for people who share at least one room with
    // them, which io.to(roomId) already guarantees by WHO receives the
    // event. We only need to check "is this person in the list I'm
    // showing" here, not "is this the right room".
    // Fires when someone joins THIS room while we're already looking at it
    // (see backend/src/sockets/index.js's room:subscribe handler) — without
    // this, the member strip would only ever reflect who was here at the
    // moment this page happened to load.
    function handleMemberJoined(member) {
      setMembers((current) =>
        current.some((m) => m.id === member.id) ? current : [...current, { ...member, isOnline: true }],
      );
    }

    function handlePresenceOnline({ userId }) {
      setMembers((current) => current.map((m) => (m.id === userId ? { ...m, isOnline: true } : m)));
    }

    function handlePresenceOffline({ userId, lastSeenAt }) {
      setMembers((current) =>
        current.map((m) => (m.id === userId ? { ...m, isOnline: false, lastSeenAt } : m)),
      );
    }

    function handleTypingStart({ roomId: eventRoomId, userId, name }) {
      if (eventRoomId !== roomId) return;

      setTypingUsers((current) =>
        current.some((u) => u.userId === userId) ? current : [...current, { userId, name }],
      );

      // Restart this user's expiry timer on every typing:start — repeated
      // keystrokes on the SENDER's side re-emit it periodically (see the
      // input handler below), which is what keeps them "alive" here for as
      // long as they keep actually typing.
      clearTimeout(typingExpireTimersRef.current.get(userId));
      const timer = setTimeout(() => {
        setTypingUsers((current) => current.filter((u) => u.userId !== userId));
        typingExpireTimersRef.current.delete(userId);
      }, TYPING_EXPIRE_MS);
      typingExpireTimersRef.current.set(userId, timer);
    }

    function handleTypingStop({ roomId: eventRoomId, userId }) {
      if (eventRoomId !== roomId) return;
      clearTimeout(typingExpireTimersRef.current.get(userId));
      typingExpireTimersRef.current.delete(userId);
      setTypingUsers((current) => current.filter((u) => u.userId !== userId));
    }

    socket.on('message:new', handleNewMessage);
    socket.on('member:joined', handleMemberJoined);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    // Removes THESE listeners specifically (same function references) when
    // the room changes or the component unmounts. The socket itself is NOT
    // closed here — SocketProvider owns its lifetime — only this page's
    // subscription to its events.
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('member:joined', handleMemberJoined);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);

      // Leaving the room while still "typing" (e.g. navigated away mid
      // keystroke) would otherwise leave every other member's UI stuck
      // showing us as typing forever — their expiry timer would eventually
      // clear it, but there's no reason to make them wait.
      if (isTypingRef.current) {
        socket.emit('typing:stop', { roomId });
        isTypingRef.current = false;
      }
      clearTimeout(typingStopTimerRef.current);
      typingExpireTimersRef.current.forEach(clearTimeout);
      typingExpireTimersRef.current.clear();
      setTypingUsers([]);
    };
  }, [socket, isConnected, roomId]);

  // --- autoscroll to the newest message ------------------------------------
  const lastMessageId = messages?.[messages.length - 1]?.id;
  useEffect(() => {
    if (lastMessageId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lastMessageId]);

  async function handleLoadEarlier() {
    if (!messages?.length) return;
    setIsLoadingEarlier(true);

    // Cursor pagination (see MessageController.index on the backend): ask
    // for messages older than the oldest one currently shown, rather than
    // an offset — stays correct even if messages have arrived since.
    const container = messageListRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;

    try {
      const page = await listMessages(roomId, { before: messages[0].createdAt });
      setMessages((current) => [...page.messages, ...current]);
      setHasMore(page.hasMore);

      // Prepending content pushes everything down; without this the user's
      // scroll position would visually jump because the browser keeps the
      // same PIXEL offset from the top, not the same messages in view.
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight;
        }
      });
    } catch (err) {
      setAccessError(extractErrorMessage(err));
    } finally {
      setIsLoadingEarlier(false);
    }
  }

  /**
   * Fires on every keystroke, but only ever EMITS on the transition from
   * not-typing to typing — repeated characters just push the stop-timer
   * back out. That's what turns "an event per keystroke" into "one
   * typing:start when a burst begins, one typing:stop when it settles",
   * which is the traffic pattern worth having for something this
   * low-stakes (nobody needs perfect real-time accuracy on a "typing…"
   * label).
   */
  function handleDraftChange(event) {
    const value = event.target.value;
    setDraft(value);

    if (!socket || !isConnected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { roomId });
    }

    clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { roomId });
    }, TYPING_STOP_DELAY_MS);
  }

  function handleSend(event) {
    event.preventDefault();
    if (!draft.trim() || !socket || !isConnected) return;

    setSendError('');

    // The message itself is proof enough that typing stopped — tell the
    // room immediately instead of waiting out TYPING_STOP_DELAY_MS, or
    // "Alice is typing…" would linger for up to 2s after her message
    // already arrived.
    if (isTypingRef.current) {
      clearTimeout(typingStopTimerRef.current);
      isTypingRef.current = false;
      socket.emit('typing:stop', { roomId });
    }

    // No optimistic local append here — the message shows up through the
    // SAME message:new broadcast every other member gets (io.to, not
    // socket.to, includes the sender — see backend/src/sockets/index.js).
    // One code path renders a message instead of two, so there's no
    // temporary-vs-confirmed state to reconcile.
    socket.emit('message:send', { roomId, content: draft }, (response) => {
      if (!response?.ok) {
        setSendError(response?.error || 'Failed to send message');
        return;
      }
      setDraft('');
    });
  }

  if (accessError && messages === null) {
    return (
      <div className="room-page">
        <p className="form-error" role="alert">
          {accessError}
        </p>
        <Link to="/">&larr; Back to rooms</Link>
      </div>
    );
  }

  return (
    <div className="room-page">
      <header className="room-page-header">
        <Link to="/" className="back-link">
          &larr;
        </Link>
        <div>
          <h1>{room?.name ?? '…'}</h1>
          {room?.description && <p>{room.description}</p>}
        </div>
        {!isConnected && <span className="connection-flag">Connecting…</span>}
      </header>

      {members.length > 0 && (
        <div className="member-strip">
          {members.map((member) => (
            <span key={member.id} className="member-pill">
              <span className={`presence-dot ${member.isOnline ? 'online' : 'offline'}`} />
              {member.name}
            </span>
          ))}
        </div>
      )}

      <div className="message-list" ref={messageListRef}>
        {hasMore && (
          <button type="button" className="load-earlier" onClick={handleLoadEarlier} disabled={isLoadingEarlier}>
            {isLoadingEarlier ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}

        {messages === null && <p className="message-list-status">Loading messages…</p>}
        {messages?.length === 0 && <p className="message-list-status">No messages yet — say hello.</p>}

        {messages?.map((message) => {
          const isOwn = message.author?.id === user?.id;
          return (
            <div key={message.id} className={`message-row ${isOwn ? 'own' : ''}`}>
              <div className="message-bubble">
                {!isOwn && <span className="message-author">{message.author?.name}</span>}
                <span className="message-content">{message.content}</span>
                <span className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="typing-indicator" aria-live="polite">
        {typingUsers.length > 0 && formatTypingLabel(typingUsers.map((u) => u.name))}
      </div>

      <form className="message-form" onSubmit={handleSend}>
        {sendError && (
          <p className="form-error" role="alert">
            {sendError}
          </p>
        )}
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
          disabled={!isConnected}
          maxLength={4000}
        />
        <button type="submit" disabled={!isConnected || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
