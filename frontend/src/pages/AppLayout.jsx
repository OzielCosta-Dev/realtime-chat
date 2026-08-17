import { Outlet } from 'react-router-dom';

import Sidebar from '../components/Sidebar.jsx';
import './AppLayout.css';

/**
 * The persistent shell for the whole authenticated app: a sidebar that
 * never unmounts as you move between rooms, plus whichever page currently
 * matches in the main panel. This is a LAYOUT route in React Router —
 * declared as the element of a parent <Route> wrapping child routes (see
 * App.jsx) — the same pattern ProtectedRoute already uses one level up,
 * just with a real UI here instead of only a redirect check.
 *
 * The alternative (each page rendering its own header/nav) is what the app
 * had before: navigating from the room list into a chat replaced the
 * ENTIRE page, including things like "who's online" that have nothing to
 * do with which room is open. Lifting the sidebar out of the per-page
 * components into one persistent layout is what turns "a list page and a
 * chat page" into something that behaves like a single application.
 */
export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
