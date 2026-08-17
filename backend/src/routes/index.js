import { Router } from 'express';

import UserController from '../controllers/UserController.js';
import SessionController from '../controllers/SessionController.js';
import RoomController from '../controllers/RoomController.js';
import MessageController from '../controllers/MessageController.js';
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

routes.get('/rooms', RoomController.index);
routes.post('/rooms', RoomController.store);
routes.get('/rooms/:id', RoomController.show);
routes.post('/rooms/:id/join', RoomController.join);
routes.get('/rooms/:id/members', RoomController.members);

routes.get('/rooms/:id/messages', MessageController.index);

export default routes;
