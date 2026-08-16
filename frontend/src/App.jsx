import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import RoomsPage from './pages/RoomsPage.jsx';
import RoomPage from './pages/RoomPage.jsx';

export default function App() {
  return (
    // AuthProvider wraps the router (not the other way around) so every
    // route — including ones that redirect before rendering anything else —
    // can call useAuth().
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* A layout route with no `path`: it renders its children only
              when ProtectedRoute's own logic (auth check) lets them through.
              Add more protected pages later as siblings inside here. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
