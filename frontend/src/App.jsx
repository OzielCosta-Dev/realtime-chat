import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AppLayout from './pages/AppLayout.jsx';
import RoomsHome from './pages/RoomsHome.jsx';
import RoomPage from './pages/RoomPage.jsx';

export default function App() {
  return (
    // AuthProvider wraps the router (not the other way around) so every
    // route — including ones that redirect before rendering anything else —
    // can call useAuth().
    <AuthProvider>
      {/* Inside AuthProvider (needs useAuth to know whether to connect) but
          outside Routes — the socket is app-wide, not tied to one page. */}
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Two nested layout routes: ProtectedRoute gates on auth, then
                AppLayout renders the persistent sidebar around whichever
                child page matches. AppLayout renders for BOTH "/" and
                "/rooms/:id" — it's the parent, they're its <Outlet />. */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<RoomsHome />} />
                <Route path="/rooms/:id" element={<RoomPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
