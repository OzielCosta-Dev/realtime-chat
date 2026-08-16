import { useAuth } from '../context/AuthContext.jsx';

export default function RoomsPage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Signed in as {user?.name}</p>
      <button type="button" onClick={logout}>
        Log out
      </button>
      <p>Room list (coming soon)</p>
    </div>
  );
}
