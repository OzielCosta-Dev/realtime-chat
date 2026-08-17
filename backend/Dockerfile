# The base image: a minimal Linux distro with Node 24 preinstalled.
# `alpine` variants are ~5x smaller than the default Debian-based image —
# musl libc instead of glibc, no unnecessary packages. Pinned to a specific
# major version (not `node:latest`) so this build behaves the same in a
# year as it does today.
FROM node:24-alpine

# Everything from here on happens inside this directory INSIDE the
# container's own filesystem — it has nothing to do with paths on your
# Windows machine.
WORKDIR /app

# Copying ONLY the manifest files first, before the rest of the source, is
# what makes Docker's layer cache actually useful here. Docker caches each
# instruction as a layer and reuses it on the next build if its inputs
# haven't changed. If `npm ci` ran after `COPY . .`, editing a single JS
# file would invalidate that layer and force a full reinstall every time.
# Splitting it like this means dependencies are only reinstalled when
# package*.json actually changes.
COPY package*.json ./

# `npm ci` (not `npm install`) for a reproducible install: it reads
# package-lock.json exactly as committed, deletes any existing
# node_modules first, and fails outright if the lockfile and package.json
# disagree — deterministic and a bit faster, which is exactly what an
# automated build wants and a developer's machine doesn't always need.
RUN npm ci

# Now the rest of the source. .dockerignore (next to this file) keeps
# node_modules and .env out of this layer.
COPY . .

EXPOSE 3001

# Runs pending migrations, THEN starts the server — every time this
# container starts. Safe to repeat: sequelize-cli tracks which migrations
# already ran (the SequelizeMeta table from step 2) and skips them. This
# is what lets `docker compose up` be the one command that gets a brand
# new machine from "empty database" to "running app" with no manual step
# in between.
CMD ["sh", "-c", "npm run db:migrate && npm start"]
