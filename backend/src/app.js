import express from 'express';
import cors from 'cors';

import { sequelize } from './models/index.js';
import routes from './routes/index.js';

const app = express();

// Allows the React dev server (a different origin) to call this API.
// We'll lock this down to a specific origin once the frontend exists.
app.use(cors());

// Parses incoming JSON bodies into req.body.
app.use(express.json());

/**
 * Health check. Deliberately touches the database rather than just returning
 * 200 — an API that answers "I'm fine" while its database is down is worse
 * than useless. Docker and deployment platforms poll endpoints like this.
 */
app.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: error.message });
  }
});

app.use(routes);

// 404 for anything unmatched above.
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Central error handler. Express identifies it by its four arguments —
// (err, req, res, next) — so `next` must stay even though it's unused.
// Express 5 forwards rejected promises from async handlers here automatically;
// in Express 4 you had to catch them yourself or use a wrapper.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // A failed model validation is the client's fault, not ours — 400, and
  // return the specific messages so the UI can show them on the right field.
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Falha na validação',
      details: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  console.error('[error]', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
  });
});

export default app;
