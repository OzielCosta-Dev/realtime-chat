import { Link, useParams } from 'react-router-dom';

// Placeholder — this is where the message history + live chat goes next.
export default function RoomPage() {
  const { id } = useParams();

  return (
    <div>
      <Link to="/">&larr; Back to rooms</Link>
      <p>Chat view for room {id} (coming next)</p>
    </div>
  );
}
