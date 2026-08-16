import { verifyToken } from '../config/auth.js';

/**
 * Gate for protected routes.
 *
 * Middleware sits between the request and the controller: it either calls
 * next() to let the request continue, or ends it with a response. Attaching
 * it to a route means the controller can assume req.userId exists — it never
 * has to check auth itself.
 */
export default function authMiddleware(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Authentication token not provided' });
  }

  // Expected format: "Bearer <token>"
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Malformed authorization header' });
  }

  try {
    const decoded = verifyToken(token);

    // Hand the controller the identity, nothing else. Controllers that need
    // the full user row can load it; most only need the id.
    req.userId = decoded.sub;

    return next();
  } catch (error) {
    // Distinguish "your session ended" from "this token is invalid" so the
    // frontend can log the user out silently instead of showing an error.
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
