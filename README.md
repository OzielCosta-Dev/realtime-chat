# Real-Time Chat App

A real-time chat application (mini Slack/Discord) built with Node.js, Socket.io,
PostgreSQL and React.

## Features

- [x] JWT authentication (register / login)
- [x] Multiple chat rooms (create, join, list)
- [x] Real-time message delivery via Socket.io
- [x] Message history persisted in PostgreSQL (cursor-paginated)
- [x] Online/offline user status
- [x] Typing indicator
- [x] Full stack runnable with `docker compose up`

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
- Backend:  http://localhost:3001
- Postgres: localhost:5432

Migrations run automatically on backend startup. Stop everything with
`docker compose down` (add `-v` to also delete the Postgres volume and
start from an empty database next time).

### Option B — local development (hot reload)

Faster feedback loop while actively changing code — Vite HMR and
`node --watch` both react instantly to file changes, where Docker requires
a rebuild.

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
