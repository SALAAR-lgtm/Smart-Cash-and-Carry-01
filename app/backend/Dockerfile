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

# Where product images are served from. docker-compose mounts the catalogue
# here as a read-only volume (../data/images), so 14 MB of photos never enter
# the image layers and the mart can add stock without a rebuild.
# data/ is deliberately NOT copied in: the compose build context is app/, and
# data/ sits at the repo root, outside it. Mounting is the fix, not COPY.
ENV IMAGES_DIR=/data/images

WORKDIR /app/backend
EXPOSE 4000

CMD ["node", "src/server.js"]
