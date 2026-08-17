import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { getRoom } from '../api/rooms.js';
import { listMessages } from '../api/messages.js';
import extractErrorMessage from '../utils/extractErrorMessage.js';
import './RoomPage.css';

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

  const bottomRef = useRef(null);
  const messageListRef = useRef(null);

  // --- load room metadata + initial message history -----------------------
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
  }, [roomId]);

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

    socket.on('message:new', handleNewMessage);

    // Removes THIS listener specifically (same function reference) when the
    // room changes or the component unmounts. The socket itself is NOT
    // closed here — SocketProvider owns its lifetime — only this page's
    // subscription to its events.
    return () => {
      socket.off('message:new', handleNewMessage);
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

  function handleSend(event) {
    event.preventDefault();
    if (!draft.trim() || !socket || !isConnected) return;

    setSendError('');

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

      <form className="message-form" onSubmit={handleSend}>
        {sendError && (
          <p className="form-error" role="alert">
            {sendError}
          </p>
        )}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
