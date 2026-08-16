import { Router } from 'express';

import UserController from '../controllers/UserController.js';
import SessionController from '../controllers/SessionController.js';
import authMiddleware from '../middlewares/auth.js';

const routes = new Router();

// --- Public routes -------------------------------------------------------
routes.post('/users', UserController.store); // register
routes.post('/sessions', SessionController.store); // login

// --- Everything below this line requires a valid token -------------------
// Calling routes.use() here applies the middleware to every route DECLARED
// AFTER it. Order is the mechanism — routes above are untouched.
routes.use(authMiddleware);

routes.get('/users/me', UserController.show);

export default routes;
