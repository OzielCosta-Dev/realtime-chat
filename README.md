# Real-Time Chat App

A real-time chat application (mini Slack/Discord) built with Node.js, Socket.io, PostgreSQL and React.

This project was built with the support of **Claude Code** as a development pair — mainly to accelerate writing adversarial tests and discuss root-cause hypotheses during debugging. Every architectural decision and fix was reviewed and understood line by line.

## Features

- JWT authentication (register / login)
- Multiple chat rooms (create, join, list)
- Real-time message delivery via Socket.io
- Message history persisted in PostgreSQL (cursor-paginated)
- Online/offline user status
- Typing indicator
- Full stack runnable with `docker compose up`

## Stack

**Backend** — Node.js, Express, Socket.io, PostgreSQL, Sequelize, JWT
**Frontend** — React, Socket.io-client, Axios
**Infra** — Docker, docker-compose

## Project structure

```
.
├── backend/          # Express API + Socket.io server
│   └── src/
│       ├── config/       # database + app configuration
│       ├── models/       # Sequelize models (User, Room, Message)
│       ├── controllers/  # request handlers (business logic)
│       ├── routes/       # HTTP route definitions
│       ├── middlewares/  # auth guard, error handling
│       ├── sockets/      # Socket.io event handlers
│       └── database/     # migrations + seeders
└── frontend/         # React client
```

## Getting started

### Option A — Docker (one command, the whole stack)

```bash
cp .env.example .env          # fill in JWT_SECRET (any long random string)
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Postgres: localhost:5432

Migrations run automatically on backend startup. Stop everything with `docker compose down` (add `-v` to also delete the Postgres volume and start from an empty database next time).

### Option B — local development (hot reload)

Faster feedback loop while actively changing code — Vite HMR and `node --watch` both react instantly to file changes, where Docker requires a rebuild.

```bash
# 1. database only
docker compose up -d db

# 2. backend
cd backend
cp .env.example .env          # fill in DB_PASSWORD=postgres, JWT_SECRET
npm install
npm run db:migrate
npm run dev                    # http://localhost:3001

# 3. frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                    # http://localhost:5173
```

## Architecture

The app uses a hybrid REST + WebSocket approach:

- **REST** handles anything that's "read a list" or "history" (`GET /rooms`, `GET /rooms/:id/messages`) — keeps HTTP status codes, caching, and debuggability with tools like curl.
- **WebSocket (Socket.io)** is reserved for what must be live: sending messages, typing, and presence.

### Socket events

| Direction | Event | Payload |
|---|---|---|
| client → server | `room:subscribe` | `{ roomId }` (with ack) |
| client → server | `message:send` | `{ roomId, content }` (with ack) |
| client ↔ server | `typing:start` / `typing:stop` | `{ roomId }` (send) / `{ roomId, userId, name }` (receive) |
| server → client | `message:new` | full persisted message |
| server → client | `presence:online` / `presence:offline` | `{ userId, name }` |
| server → client | `member:joined` | `{ id, name }` |
| server → client | `room:deleted` | `{ roomId }` |

Every message is persisted (`Message.create()`) **before** being broadcast (persist-then-broadcast pattern) — this guarantees the REST history is always the source of truth, even if a broadcast never reaches every client.

Naming follows a `noun:verb` convention (not `onMessage`, not `newMessage`) — it makes ownership obvious as the event list grows (`room:*`, `message:*`, `typing:*`, `presence:*`).

Acknowledgements (`ack`) are used only where failure actually matters: `message:send` has one because the user needs to know if their message went through. `typing:start`/`typing:stop` don't — occasionally losing a "typing" event has zero consequence.

## Authentication over WebSocket

Uses the exact same JWT verification function as the REST API (`verifyToken`), called by both the HTTP middleware and the socket middleware — not a parallel auth system.

The real difference is transport and frequency, not the credential: REST checks the token on every request; the socket checks it once, at handshake (`io(url, { auth: { token } })`), and the connection stays trusted for as long as it's open. Because of that, sensitive actions re-check the database at the time of the action instead of trusting client-supplied data — `room:subscribe` re-queries `RoomMember` rather than trusting the `roomId` the client sent, and `message:send` checks `socket.rooms` (a confirmed membership cache) instead of accepting anything the client claims.

## The hardest bug: a presence race condition

**Symptom:** opening a second tab and closing the first one almost immediately would mark the user offline — even with a tab still open.

**Root cause:** connection registration ran *after* an `await` to the database (checking room memberships). The client's `'connect'` event fires as soon as the server accepts the handshake — which happens *during* that async handler, before the `await` resolves. This created a real window where tab 2 was already usable on the browser side, but not yet registered on the server. Closing tab 1 inside that window made the disconnect handler see a connection set containing only itself, and it concluded — incorrectly — that the user had gone fully offline.

**How it was found:** not from a bug report — from writing an adversarial test on purpose (open tab 2, immediately close tab 1, assert the user stays online) instead of only testing the happy path (open, close, wait, check — which would never catch the race, since normal human click timing gives the `await` plenty of time to resolve). The test failed on the first run. Understanding why required understanding Socket.io's exact ordering guarantee: the synchronous portion of an async handler runs to completion — or to the first `await` — before the client ever sees `'connect'`. Moving connection registration to the first synchronous line of the handler fixed it.

**Why it was tricky:** the code looked correct in isolation. It only breaks under a specific timing condition that no one would ever reproduce by testing manually — the kind of bug that would silently leak into production as "why was I marked offline with a tab still open," hard to reproduce and hard to even notice without an adversarial test.

## Known limitations / next steps

- **Messages lost during a connection drop aren't recovered automatically.** Socket.io's automatic reconnection restores the event flow going forward, but has no notion of "catch me up on what I missed." Verified by forcing a real socket disconnect (not just blocking network requests, which is a different thing and doesn't actually drop an open WebSocket) mid-message: the message never appeared without a manual reload. Fix: listen for the socket.io-client `reconnect` event and re-run history fetch incrementally, reusing the same cursor-based pagination already built for loading older messages — just pointed forward instead of backward.
- **`is_online` can go stale after an ungraceful server crash** (an OOM kill, not a normal `docker compose down`). The only code that resets this flag is the `disconnect` handler, which needs the process alive to run. Fix: reset `is_online = false` for everyone on server boot (a fresh process always has zero real connections, so this is always safe), and/or a heartbeat mechanism with expiration.
- **No native horizontal scalability.** Both Socket.io's rooms and this project's own presence tracking (`connectionsByUser`) live in a single process's memory. Running multiple instances would need Socket.io's Redis adapter for room broadcasts, plus migrating presence tracking to shared storage (Redis) — the adapter alone only solves the library's state, not the custom state built on top of it.

## Author

Oziel Costa — [LinkedIn](https://linkedin.com/in/ozielcosta) · [GitHub](https://github.com/OzielCosta-Dev)

# 3. frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                    # http://localhost:5173
```
