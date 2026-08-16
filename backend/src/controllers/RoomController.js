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

  /** POST /rooms — create a room; the creator joins it automatically */
  async store(req, res) {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const existing = await Room.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A room with that name already exists' });
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
        return res.status(409).json({ error: 'A room with that name already exists' });
      }
      throw error;
    }
  }

  /** POST /rooms/:id/join */
  async join(req, res) {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'Invalid room id' });
    }

    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
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
      return res.status(400).json({ error: 'Invalid room id' });
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
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json(room.members);
  }
}

export default new RoomController();
