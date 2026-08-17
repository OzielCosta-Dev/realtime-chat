import http from './http.js';

/**
 * `before` is the cursor from the previous page's `nextCursor` — see
 * MessageController.index on the backend for why this is cursor-based
 * pagination rather than page-number based (new messages arriving while
 * scrolling would shift offset-based pages under the user's feet).
 */
export function listMessages(roomId, { before } = {}) {
  return http
    .get(`/rooms/${roomId}/messages`, { params: before ? { before } : undefined })
    .then((res) => res.data);
}
