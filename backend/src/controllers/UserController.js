import { User } from '../models/index.js';
import { signToken } from '../config/auth.js';

class UserController {
  /** POST /users — register */
  async store(req, res) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    // Check first so the common case gets a clean 409 instead of a raw
    // constraint error. The UNIQUE index is still the real guarantee —
    // two simultaneous registrations can both pass this check, and the
    // catch block below handles that race.
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    try {
      // `password` is the virtual field — the model hashes it for us.
      const user = await User.create({ name, email, password });

      return res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email },
        token: signToken(user.id),
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      throw error;
    }
  }

  /** GET /users/me — the authenticated user's own profile */
  async show(req, res) {
    // defaultScope already strips passwordHash.
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json(user);
  }
}

export default new UserController();
