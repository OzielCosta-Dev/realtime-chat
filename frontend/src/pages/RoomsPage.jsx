import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { listRooms, createRoom, joinRoom } from '../api/rooms.js';
import extractErrorMessage from '../utils/extractErrorMessage.js';
import './RoomsPage.css';

export default function RoomsPage() {
  const { user, logout } = useAuth();

  // null (not yet loaded) is kept distinct from [] (loaded, genuinely
  // empty) — that's what lets the render below tell "still loading" apart
  // from "no rooms exist yet".
  const [rooms, setRooms] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Tracks ONLY the room currently being joined, not a blanket "busy" flag —
  // so clicking Join on one room doesn't grey out the Join button on every
  // other room in the list.
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch((err) => setLoadError(extractErrorMessage(err)));
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      const room = await createRoom({ name: newRoomName, description: newRoomDescription });
      // The backend already returns the new room with isMember: true (the
      // creator auto-joins — see RoomController.store). Prepending it to
      // local state shows it immediately, without a second round trip to
      // re-fetch the whole list just to get back data we already have.
      setRooms((current) => [room, ...current]);
      setNewRoomName('');
      setNewRoomDescription('');
    } catch (err) {
      setCreateError(extractErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(roomId) {
    setJoinError('');
    setJoiningRoomId(roomId);

    try {
      await joinRoom(roomId);
      setRooms((current) =>
        current.map((room) => (room.id === roomId ? { ...room, isMember: true } : room)),
      );
    } catch (err) {
      setJoinError(extractErrorMessage(err));
    } finally {
      setJoiningRoomId(null);
    }
  }

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <span>
          Signed in as <strong>{user?.name}</strong>
        </span>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </header>

      <section className="create-room">
        <h2>Create a room</h2>
        <form onSubmit={handleCreate}>
          {createError && (
            <p className="form-error" role="alert">
              {createError}
            </p>
          )}
          <input
            type="text"
            placeholder="Room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            minLength={2}
            maxLength={60}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            maxLength={255}
          />
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </section>

      <section className="room-list">
        <h2>Rooms</h2>

        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}
        {joinError && (
          <p className="form-error" role="alert">
            {joinError}
          </p>
        )}

        {rooms === null && !loadError && <p>Loading rooms…</p>}
        {rooms?.length === 0 && <p>No rooms yet — create the first one above.</p>}

        <ul>
          {rooms?.map((room) => (
            <li key={room.id} className="room-item">
              <div className="room-info">
                <span className="room-name">{room.name}</span>
                {room.description && <span className="room-description">{room.description}</span>}
              </div>

              {room.isMember ? (
                <Link to={`/rooms/${room.id}`} className="room-action">
                  Enter
                </Link>
              ) : (
                <button
                  type="button"
                  className="room-action"
                  onClick={() => handleJoin(room.id)}
                  disabled={joiningRoomId === room.id}
                >
                  {joiningRoomId === room.id ? 'Joining…' : 'Join'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
