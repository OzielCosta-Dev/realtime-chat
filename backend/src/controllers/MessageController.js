import { Op } from 'sequelize';

import { Message, User, RoomMember } from '../models/index.js';
import isUuid from '../utils/isUuid.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

class MessageController {
  /**
   * GET /rooms/:id/messages?limit=50&before=<ISO timestamp>
   *
   * Cursor pagination, not offset pagination.
   *
   * With OFFSET, "page 2" means "skip the newest 50". But this is a chat — new
   * messages arrive while the user is scrolling, so everything shifts down and
   * page 2 re-shows rows the user already saw. A cursor ("give me messages
   * older than this exact timestamp") is stable no matter what arrives.
   *
   * It's also faster: OFFSET 10000 makes Postgres walk and discard 10,000 rows,
   * while the cursor uses our (room_id, created_at) index to seek straight to
   * the right spot.
   */
  async index(req, res) {
    const { id: roomId } = req.params;
    const { before } = req.query;

    if (!isUuid(roomId)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    // Only members can read a room's history. Checking here keeps the rule in
    // one place — the socket layer will call the same check before letting a
    // connection subscribe.
    const membership = await RoomMember.findOne({
      where: { userId: req.userId, roomId },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Você não é membro desta sala' });
    }

    // Clamp the limit so a client can't ask for the entire table.
    const limit = Math.min(
      Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT,
      MAX_LIMIT,
    );

    const where = { roomId };

    if (before) {
      const beforeDate = new Date(before);
      if (Number.isNaN(beforeDate.getTime())) {
        return res.status(400).json({ error: 'Parâmetro de data inválido' });
      }
      where.createdAt = { [Op.lt]: beforeDate };
    }

    // Query newest-first so LIMIT keeps the most recent messages...
    const messages = await Message.findAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit,
    });

    // ...then reverse, because the UI renders oldest at the top.
    const ordered = messages.reverse();

    return res.json({
      messages: ordered,
      // The cursor for the next page back. null when we've reached the start.
      nextCursor: messages.length === limit ? ordered[0].createdAt : null,
      hasMore: messages.length === limit,
    });
  }
}

export default new MessageController();
