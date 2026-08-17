import './RoomsHome.css';

/**
 * Rendered at "/" — the state before any room is selected. Mirrors what
 * Slack or Discord show in the main panel before you click a channel:
 * not an error, not a loading spinner, just an inviting blank slate that
 * points at what to do next.
 */
export default function RoomsHome() {
  return (
    <div className="rooms-home">
      <div className="rooms-home-icon">
        <svg viewBox="0 0 24 24" fill="none" width="40" height="40">
          <path
            d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H9l-4 4v-4H5.5C4.67 16 4 15.33 4 14.5v-9Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      </div>
      <h1>Selecione uma sala</h1>
      <p>Escolha uma conversa na barra lateral ou crie uma nova sala para começar.</p>
    </div>
  );
}
