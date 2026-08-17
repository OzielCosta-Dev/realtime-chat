import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * A layout route (used as element={<ProtectedRoute />} with children in
 * App.jsx). <Outlet /> is where React Router renders whichever child route
 * matched — so this component itself never needs to know or care what
 * page it's guarding.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for the mount-time token check (AuthContext) to finish before
  // deciding. Without this, a logged-in user refreshing the page would
  // flash to /login for a frame while `user` is still null, then bounce
  // back once the check resolves.
  if (isLoading) {
    return <div className="page-loading">Carregando…</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
