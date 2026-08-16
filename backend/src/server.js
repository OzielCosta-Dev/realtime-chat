import 'dotenv/config';

import app from './app.js';
import { connectDatabase } from './config/database.js';

const PORT = process.env.PORT || 3001;

/**
 * app.js builds the Express application; server.js starts it.
 *
 * Keeping them separate matters for two reasons:
 *   1. Tests can import `app` and make requests against it without binding
 *      a real port.
 *   2. Socket.io (step 4) needs to attach to the raw HTTP server, which is
 *      created here — not inside the Express app.
 */
async function start() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    process.exit(1);
  }
}

start();
