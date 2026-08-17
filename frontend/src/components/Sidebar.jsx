import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { listRooms, createRoom, joinRoom, deleteRoom } from '../api/rooms.js';
import extractErrorMessage from '../utils/extractErrorMessage.js';
import Avatar from './Avatar.jsx';
import Brand from './Brand.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { id: activeRoomId } = useParams();

  const [rooms, setRooms] = useState(null);
  const [listError, setListError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [pendingRoomId, setPendingRoomId] = useState(null); // room currently being joined
  const [deleteTarget, setDeleteTarget] = useState(null); // room pending delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch((err) => setListError(extractErrorMessage(err)));
  }, []);

  // Live-removes a room from the list the moment it's deleted — by anyone,
  // not just this tab — and bounces out of it if it was the one currently
  // open. Only reaches rooms this user is actually a member of (see
  // RoomController.destroy on the backend: the broadcast goes to the
  // room's own Socket.io channel, which only members were ever subscribed
  // to) — a room you can see in the list but never joined can still
  // disappear silently on next reload, which is an accepted, narrow gap
  // rather than something worth a separate global channel for.
  useEffect(() => {
    if (!socket) return undefined;

    function handleRoomDeleted({ roomId }) {
      setRooms((current) => current?.filter((r) => r.id !== roomId) ?? current);
      if (activeRoomId === roomId) navigate('/');
    }

    socket.on('room:deleted', handleRoomDeleted);
    return () => socket.off('room:deleted', handleRoomDeleted);
  }, [socket, activeRoomId, navigate]);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      const room = await createRoom({ name: newRoomName, description: newRoomDescription });
      setRooms((current) => [room, ...(current ?? [])]);
      setNewRoomName('');
      setNewRoomDescription('');
      setIsCreateOpen(false);
      // Straight into the new room — you just made it, you're almost
      // certainly about to start talking in it.
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      setCreateError(extractErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoomClick(room) {
    if (room.isMember) {
      navigate(`/rooms/${room.id}`);
      return;
    }

    setListError('');
    setPendingRoomId(room.id);
    try {
      await joinRoom(room.id);
      setRooms((current) => current.map((r) => (r.id === room.id ? { ...r, isMember: true } : r)));
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      setListError(extractErrorMessage(err));
    } finally {
      setPendingRoomId(null);
    }
  }

  function handleDeleteClick(event, room) {
    event.stopPropagation();
    setDeleteTarget(room);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteRoom(deleteTarget.id);
      setRooms((current) => current.filter((r) => r.id !== deleteTarget.id));
      if (activeRoomId === deleteTarget.id) navigate('/');
    } catch (err) {
      setListError(extractErrorMessage(err));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Brand />
      </div>

      <div className="sidebar-section-header">
        <span>Salas</span>
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsCreateOpen((open) => !open)}
          aria-label={isCreateOpen ? 'Fechar' : 'Criar sala'}
          title={isCreateOpen ? 'Fechar' : 'Criar sala'}
        >
          {isCreateOpen ? '×' : '+'}
        </button>
      </div>

      {isCreateOpen && (
        <form className="create-room-form" onSubmit={handleCreate}>
          {createError && (
            <p className="sidebar-error" role="alert">
              {createError}
            </p>
          )}
          <input
            type="text"
            placeholder="Nome da sala"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            minLength={2}
            maxLength={60}
            autoFocus
            required
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            maxLength={255}
          />
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Criando…' : 'Criar sala'}
          </button>
        </form>
      )}

      {listError && !isCreateOpen && (
        <p className="sidebar-error" role="alert">
          {listError}
        </p>
      )}

      <nav className="room-nav">
        {rooms === null && <p className="sidebar-status">Carregando salas…</p>}
        {rooms?.length === 0 && <p className="sidebar-status">Nenhuma sala ainda.</p>}

        {rooms?.map((room) => {
          const isActive = room.id === activeRoomId;
          const canDelete = room.createdBy === user?.id;

          return (
            <button
              key={room.id}
              type="button"
              className={`room-row ${isActive ? 'active' : ''}`}
              onClick={() => handleRoomClick(room)}
              disabled={pendingRoomId === room.id}
            >
              <Avatar name={room.name} size={32} />
              <span className="room-row-text">
                <span className="room-row-name">{room.name}</span>
                {!room.isMember && <span className="room-row-badge">Participar</span>}
                {room.description && room.isMember && (
                  <span className="room-row-description">{room.description}</span>
                )}
              </span>
              {canDelete && (
                <span
                  className="room-row-delete"
                  role="button"
                  tabIndex={0}
                  aria-label={`Excluir sala ${room.name}`}
                  onClick={(e) => handleDeleteClick(e, room)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleDeleteClick(e, room);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path
                      d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-7 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Link to="/" className="sidebar-user">
          <Avatar name={user?.name} size={32} />
          <span className="sidebar-user-name">{user?.name}</span>
        </Link>
        <button type="button" className="icon-button" onClick={logout} aria-label="Sair" title="Sair">
          <svg viewBox="0 0 24 24" fill="none" width="17" height="17">
            <path
              d="M15 17l5-5-5-5M20 12H9M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir sala"
        message={
          deleteTarget &&
          `Tem certeza que deseja excluir "${deleteTarget.name}"? Todas as mensagens serão apagadas permanentemente para todos os membros.`
        }
        confirmLabel={isDeleting ? 'Excluindo…' : 'Excluir'}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </aside>
  );
}
