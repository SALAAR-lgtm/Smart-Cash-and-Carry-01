# Smart Cash & Carry

Online grocery store for a real mart in Noorkot, Punjab, Pakistan.
React + Vite frontend, Express backend, PostgreSQL, Dockerised.

Full project context lives one level up in `../PLAN-NOTES.md`. **Read that first.**

## Running locally (no Docker needed)

```bash
cd backend
npm install
npm run dev          # http://localhost:4000
curl localhost:4000/api/health
```

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Local dev uses **PGlite** — real Postgres compiled to WebAssembly, running inside
Node. No database install, no service, no admin rights. The schema in `db/init.sql`
is applied automatically on boot.

To test on a phone on the same Tailscale network: `http://100.98.5.62:5173`

## Running on the VM (Docker)

```bash
cp .env.example .env     # then fill in real values
docker compose up -d
docker compose ps
```

The backend switches to the real `pg` driver via `DB_DRIVER=postgres`. The SQL is
identical either way — only the driver changes.

## Two things that will bite you

1. **Postgres table names are capitalised and singular.** Always quote them:
   `SELECT * FROM "Product";`. Lowercase `products` fails even though the table exists.
2. **Port 5432 is deliberately not published to the host.** The backend reaches
   Postgres over the Docker network by service name `db`. Don't "fix" this.

## Status

Sprint 0 — the pipeline works end to end with 3 seeded products.
Sprint 1 loads the full 119-product catalog. See `../PLAN-NOTES.md`.
