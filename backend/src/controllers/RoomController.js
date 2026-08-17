import { Room, User, RoomMember, sequelize } from '../models/index.js';
import isUuid from '../utils/isUuid.js';

class RoomController {
  /** GET /rooms — every room, flagged with whether the caller has joined */
  async index(req, res) {
    const rooms = await Room.findAll({
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['created_at', 'ASC']],
    });

    // One query for all of the caller's memberships, then match in memory.
    //
    // The naive alternative — checking membership inside a loop over rooms —
    // is the N+1 query problem: 20 rooms becomes 21 round trips to the
    // database. Worth being able to name in an interview.
    const memberships = await RoomMember.findAll({
      where: { userId: req.userId },
      attributes: ['roomId'],
      raw: true,
    });
    const joinedRoomIds = new Set(memberships.map((m) => m.roomId));

    return res.json(
      rooms.map((room) => ({
        ...room.toJSON(),
        isMember: joinedRoomIds.has(room.id),
      })),
    );
  }

  /**
   * GET /rooms/:id — single room, for the chat header.
   *
   * Open to any authenticated user, same as index() and members() below —
   * a room's NAME isn't sensitive. Only its message CONTENT is gated to
   * members (see MessageController), the same way a Slack public channel
   * shows its name to everyone but not its history.
   */
  async show(req, res) {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    const room = await Room.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    });

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    const membership = await RoomMember.findOne({ where: { userId: req.userId, roomId: id } });

    return res.json({ ...room.toJSON(), isMember: Boolean(membership) });
  }

  /** POST /rooms — create a room; the creator joins it automatically */
  async store(req, res) {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome é obrigatório' });
    }

    const existing = await Room.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma sala com esse nome' });
    }

    try {
      // A transaction makes both writes succeed or both fail. Without it, a
      // crash between them would leave a room whose own creator isn't a
      // member — a state the app should never be able to reach.
      const room = await sequelize.transaction(async (t) => {
        const created = await Room.create(
          { name, description: description || null, createdBy: req.userId },
          { transaction: t },
        );

        await RoomMember.create(
          { userId: req.userId, roomId: created.id },
          { transaction: t },
        );

        return created;
      });

      return res.status(201).json({ ...room.toJSON(), isMember: true });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Já existe uma sala com esse nome' });
      }
      throw error;
    }
  }

  /** POST /rooms/:id/join */
  async join(req, res) {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    // findOrCreate makes this idempotent: joining twice is not an error,
    // it just returns the membership that already existed.
    const [, created] = await RoomMember.findOrCreate({
      where: { userId: req.userId, roomId: id },
      defaults: { userId: req.userId, roomId: id },
    });

    return res.status(created ? 201 : 200).json({
      room: room.toJSON(),
      isMember: true,
      alreadyJoined: !created,
    });
  }

  /** GET /rooms/:id/members */
  async members(req, res) {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    const room = await Room.findByPk(id, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'name', 'isOnline', 'lastSeenAt'],
          through: { attributes: [] }, // hide the join-table columns
        },
      ],
    });

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    return res.json(room.members);
  }

  /**
   * DELETE /rooms/:id — creator only.
   *
   * Messages and room_members rows are NOT deleted here in application
   * code — they're removed by the database itself via the ON DELETE
   * CASCADE foreign keys set up in the migrations back in step 2. One
   * DELETE statement on rooms, and Postgres cascades the rest atomically;
   * no risk of a crash between "delete messages" and "delete the room"
   * leaving orphaned rows, because there's only one statement to begin
   * with.
   */
  async destroy(req, res) {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    if (room.createdBy !== req.userId) {
      return res.status(403).json({ error: 'Apenas quem criou a sala pode excluí-la' });
    }

    await room.destroy();

    // Anyone with this room open right now (via its live socket
    // subscription — see backend/src/sockets/index.js) needs to be told
    // directly: the REST call only reaches the browser tab that clicked
    // delete, not every other tab currently viewing this room's chat.
    const io = req.app.get('io');
    io.to(id).emit('room:deleted', { roomId: id });
    // Also evicts every socket from the Socket.io room itself, so a stale
    // membership can't linger in memory after the underlying room is gone.
    io.in(id).socketsLeave(id);

    return res.status(204).send();
  }
}

export default new RoomController();
