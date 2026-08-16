import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, register as registerRequest, fetchCurrentUser } from '../api/auth.js';

const AuthContext = createContext(null);

/**
 * Wraps the whole app (see App.jsx) so any component can call useAuth()
 * instead of having `user` and `token` passed down as props through every
 * layer in between — that prop-drilling gets unmanageable fast in an app
 * where the header, the room list, AND the message box all need to know
 * who's logged in.
 */
export function AuthProvider({ children }) {
  // Lazy initializer: reads localStorage exactly once, on first render, not
  // on every re-render. Means a page refresh doesn't flash a logged-out
  // state before this runs — the stored user is there from the first paint.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Starts true so ProtectedRoute can hold off rendering anything until we
  // know whether the stored token is still actually valid.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsLoading(false);
      return;
    }

    // localStorage having a token doesn't mean it's still valid — it may
    // have expired since the last visit. Confirming with the server on
    // mount also refreshes `user` in case anything about the account
    // changed. If it's rejected, http.js's response interceptor already
    // clears storage and redirects to /login — nothing to do here but stop
    // loading.
    fetchCurrentUser()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function login(credentials) {
    const { user: loggedInUser, token } = await loginRequest(credentials);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  async function register(data) {
    const { user: newUser, token } = await registerRequest(data);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * The custom-hook wrapper is what lets components write
 *   const { user, login } = useAuth()
 * instead of importing AuthContext and calling useContext directly
 * everywhere. The thrown error also catches, at dev time, a component that
 * forgot it needs to render inside <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
