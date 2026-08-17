# --- Stage 1: build --------------------------------------------------------
# `AS build` names this stage so stage 2 can pull files out of it. This
# stage's image is thrown away at the end — only the files we explicitly
# COPY --from=build in stage 2 survive into the final image.
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes any VITE_-prefixed env var into the compiled JS at BUILD time —
# unlike the backend, which reads process.env at RUNTIME. There's no way to
# change VITE_API_URL after this step without rebuilding the image. `ARG`
# accepts it from docker-compose's `build.args` (see docker-compose.yml).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Produces /app/dist — plain HTML, CSS and JS. No Node involved in
# actually running this output; a browser could open dist/index.html
# directly.
RUN npm run build

# --- Stage 2: serve ---------------------------------------------------------
# A fresh, unrelated base image — nginx, not node. None of stage 1's ~200MB
# of node_modules and build tooling exists here; only what's explicitly
# copied in below does. This is the whole point of naming it a separate
# stage: the final image is a web server plus a folder of static files,
# nothing else.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Replaces nginx's default site config — see nginx.conf for why a plain
# default doesn't work for a React Router app.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
