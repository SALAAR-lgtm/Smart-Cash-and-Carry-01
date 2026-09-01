FROM node:22-alpine

WORKDIR /app

COPY frontend/package.json ./package.json
RUN npm install

COPY frontend/ ./

EXPOSE 5173

# Sprint 0: Vite dev server. Deliberately NOT production-ready — Sprint 7
# replaces this with an nginx production build (vite build -> static files).
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
