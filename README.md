# Real-Time Chat App

A real-time chat application (mini Slack/Discord) built with Node.js, Socket.io,
PostgreSQL and React.

## Features

- [ ] JWT authentication (register / login)
- [ ] Multiple chat rooms (create, join, list)
- [ ] Real-time message delivery via Socket.io
- [ ] Message history persisted in PostgreSQL
- [ ] Online/offline user status
- [ ] Typing indicator
- [ ] Full stack runnable with `docker compose up`

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

_Work in progress — setup instructions added as the project is built._
