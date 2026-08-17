import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import app from './app.js';
import { connectDatabase } from './config/database.js';
import registerSocketHandlers from './sockets/index.js';

const PORT = process.env.PORT || 3001;

/**
 * app.listen(PORT) is actually shorthand for "create an http.Server wrapping
 * this Express app, then listen on it" — Express does that for you and
 * hands back the result. We need our OWN reference to that http.Server
 * BEFORE it starts listening, because Socket.io attaches to it directly (it
 * listens for the 'upgrade' event that turns an HTTP connection into a
 * WebSocket one). So we build it explicitly with createServer(app) instead
 * of letting Express hide it from us.
 */
async function start() {
  try {
    await connectDatabase();

    const httpServer = createServer(app);

    const io = new Server(httpServer, {
      // TODO: narrow this to the frontend's real origin once it exists.
      cors: { origin: '*' },
    });

    registerSocketHandlers(io);

    // app.set/app.get is Express's own key-value store, scoped to this one
    // app instance. This is what lets an HTTP controller (RoomController.
    // destroy) reach the socket server to broadcast an event — req.app is
    // always available inside a controller, so req.app.get('io') gets it
    // there without a module-level global or a circular import between
    // app.js and sockets/index.js.
    app.set('io', io);

    httpServer.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    process.exit(1);
  }
}

start();
