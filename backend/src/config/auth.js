import jwt from 'jsonwebtoken';

const { JWT_SECRET, JWT_EXPIRES_IN = '7d' } = process.env;

// Fail at boot, not at the first login attempt. A missing secret is a
// misconfiguration we want to hear about immediately.
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
}

/**
 * Builds a signed token for a user.
 *
 * A JWT is three base64url segments joined by dots: header.payload.signature.
 * The payload is ENCODED, not encrypted — anyone can read it. The signature is
 * what matters: only someone holding JWT_SECRET can produce a valid one, so the
 * server can trust a token it didn't store anywhere.
 *
 * That statelessness is the whole point: no session table, no lookup per
 * request. The cost is that you cannot un-issue a token before it expires,
 * which is why expiry is short-ish and why real systems add a refresh-token
 * or denylist layer.
 *
 * Never put secrets in the payload. `sub` (the user id) is enough — everything
 * else can be looked up.
 */
export function signToken(userId) {
  return jwt.sign({}, JWT_SECRET, {
    subject: String(userId),
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifies signature and expiry. Throws if the token was tampered with,
 * signed by a different secret, or has expired.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
