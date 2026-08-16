/**
 * In-memory registry of userId -> set of open socket ids.
 *
 * A user can have multiple tabs/devices open at once, each its own socket
 * connection. "Online" should mean "at least one connection is open", so we
 * can't just flip a boolean on every connect/disconnect — that would mark a
 * user offline the moment they close ONE tab while another is still open.
 * Tracking a set per user and reacting only when it goes 0 -> 1 or 1 -> 0
 * gets this right.
 *
 * This lives in the Node process's memory, not the database. That's fine for
 * a single server instance; it's also exactly the thing that breaks if you
 * ever run two instances behind a load balancer, because each process would
 * have its own, disagreeing registry. The database (`users.is_online`) stays
 * the source of truth for anyone asking "who's online" via a fresh query;
 * this map only exists to know WHEN that column should change.
 */
const connectionsByUser = new Map();

/** Returns true if this is the user's first open connection. */
export function registerConnection(userId, socketId) {
  const existing = connectionsByUser.get(userId);

  if (existing) {
    existing.add(socketId);
    return false;
  }

  connectionsByUser.set(userId, new Set([socketId]));
  return true;
}

/** Returns true if this was the user's last open connection. */
export function removeConnection(userId, socketId) {
  const existing = connectionsByUser.get(userId);
  if (!existing) return true;

  existing.delete(socketId);

  if (existing.size === 0) {
    connectionsByUser.delete(userId);
    return true;
  }

  return false;
}
