FROM node:22-alpine

WORKDIR /app

# Install deps first so Docker can cache this layer across code changes.
COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --omit=dev

# Layout mirrors the local one on purpose: src lives at <root>/backend/src and
# the schema at <root>/db, so db.js resolves ../../db/init.sql identically in
# both environments.
COPY backend/src ./backend/src
COPY db ./db

WORKDIR /app/backend
EXPOSE 4000

CMD ["node", "src/server.js"]
