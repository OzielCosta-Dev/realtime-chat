import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * ONE socket connection for the whole app, created once after login and
 * shared through context — not one per page. Two reasons that matters here:
 *
 *  1. The backend auto-subscribes a connecting socket to every room the
 *     user belongs to (see backend/src/sockets/index.js). If RoomPage
 *     opened its own socket per visit, navigating between rooms would
 *     mean reconnecting — and briefly missing live events — every time.
 *  2. Presence (online/offline) is inherently about the CONNECTION, not
 *     any one page. A per-page socket would flicker a user online/offline
 *     every time they switched rooms.
 */
export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    const token = localStorage.getItem('token');
    const connection = io(SOCKET_URL, { auth: { token } });

    connection.on('connect', () => setIsConnected(true));
    connection.on('disconnect', () => setIsConnected(false));

    setSocket(connection);

    // Runs when isAuthenticated flips back to false (logout) or on unmount —
    // without this, logging out would leave the old connection open,
    // authenticated as a user the app no longer considers logged in.
    return () => {
      connection.close();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
