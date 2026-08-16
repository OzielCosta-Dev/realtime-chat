import { verifyToken } from '../config/auth.js';
import { User } from '../models/index.js';

/**
 * Socket.io middleware — runs once, during the handshake, before
 * 'connection' fires. Equivalent in spirit to src/middlewares/auth.js, but
 * for a different transport: HTTP sends a header on every request, a socket
 * sends its token once when the connection opens and then stays open for
 * the rest of the session.
 *
 * That's a real tradeoff, not just a style difference: an HTTP-authenticated
 * request is re-checked every single time, but a socket authenticated at
 * 09:00 is still treated as that same identity at 17:00 even if, say, the
 * account got deleted at noon. Token expiry is the only backstop, which is
 * one reason JWT_EXPIRES_IN shouldn't be too long-lived in a real system.
 */
export default async function authenticateSocket(socket, next) {
  try {
    const { token } = socket.handshake.auth;

    if (!token) {
      return next(new Error('Authentication token not provided'));
    }

    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.sub);

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attached here, read everywhere else in the sockets/ layer — the same
    // role req.userId plays for HTTP routes.
    socket.userId = user.id;
    socket.data.user = { id: user.id, name: user.name };

    return next();
  } catch {
    return next(new Error('Invalid token'));
  }
}
