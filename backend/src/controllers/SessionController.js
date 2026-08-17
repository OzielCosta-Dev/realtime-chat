import { User } from '../models/index.js';
import { signToken } from '../config/auth.js';

class SessionController {
  /**
   * POST /sessions — login
   *
   * Modelled as creating a "session" resource rather than POST /login,
   * which keeps the API RESTful: logging in creates a session, logging out
   * would delete one.
   */
  async store(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // withPassword — we need the hash, which defaultScope hides.
    const user = await User.scope('withPassword').findOne({ where: { email } });

    // Deliberately the SAME message and status for "no such user" and "wrong
    // password". Distinguishing them would let anyone probe which emails have
    // accounts (user enumeration).
    const invalid = { error: 'E-mail ou senha inválidos' };

    if (!user) {
      return res.status(401).json(invalid);
    }

    if (!(await user.checkPassword(password))) {
      return res.status(401).json(invalid);
    }

    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: signToken(user.id),
    });
  }
}

export default new SessionController();
