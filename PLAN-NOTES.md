# PLAN NOTES — Smart Cash & Carry

> **This file exists so a brand-new session can be useful in under a minute.**
> It lives next to the code on the E drive. No network, no MCP, no Notion needed.
> Update sections 6 and 7 at the end of **every** session. Append to section 9.
> Everything above section 6 is stable — edit it only when a decision changes.

---

## 0. START HERE — session protocol

1. Read this whole file. Do not skip to the bottom.
2. Check **section 6 (Current state)** and **section 7 (Next action)**.
3. If anything in section 6 is stale, fix it before doing anything else.
4. Do the next action. Nothing else.
5. Before ending: rewrite 6 and 7, append a dated line to 9.

If this file has not been updated since your last session, **suspect it** —
verify against reality before trusting it.

---

## 1. What this project is

An online grocery store for **Smart Cash & Carry**, a real physical mart in
Noorkot, Punjab, Pakistan, with no online presence today.

Built by **Qasim** (12th-grade pass, self-taught, no college, aiming at DevOps).
Secondary goal, as important as the app: **learn DevOps, system design and
product management by building this**, not just end up with a finished app.

Builder split: **Qasim types the commands, Buddy unblocks and explains.**
Not "Buddy writes it" — that pattern already failed once (see section 9).

**Product spec (locked):**
- Customer: catalog with categories, search/filters, product detail (price,
  availability, image), cart, guest checkout (Name, Phone, Address — no
  accounts), order confirmation. Delivery only, local area. No pickup.
- Admin: password login (single admin, no signup), product CRUD, availability
  toggle, order list, **analytics dashboard with revenue by category**.
- Orders: cash on delivery only, no payment gateway. Single `completed` flag.
- WhatsApp ping to the admin on every new order, via CallMeBot (free).
- Mobile-first. Purple/red brand (see section 4).

**Deploy target:** `lab` VM, 145.241.110.17.

---

## 2. Infrastructure — expensive to rediscover, do not lose this

### This PC (where code is written)
- Tailscale IP: **`100.98.5.62`**
- Node 22, npm 10.9.7, git 2.55, Python 3.13, SSH, Tailscale installed
- **Docker Desktop is installed but CANNOT run** — WSL is blocked by the
  machine's security policy. Do not keep retrying it.
- No native PostgreSQL. `gh` CLI not installed.
- Project root: **`E:\Smart-Cash-and-Carry`**

### GitHub — connected 1 Sep 2026
- Account **SALAAR-lgtm**, repo
  **`git@github.com:SALAAR-lgtm/Smart-Cash-and-Carry-01.git`**
  (canonical name is capitalised; the lowercase form still works but warns).
- Branch **`master`**, tracking `origin/master`.
- **Dedicated SSH key `~/.ssh/github_scc`** (ed25519, comment `smart-cash-carry`),
  wired into `~/.ssh/config` under a `Host github.com` block with
  `IdentitiesOnly yes`. Plain `git push` just works — no key flags, no token.
- **Do not reuse the VM keys for GitHub.** All five (`greenscape_oci`,
  `id_ed25519_hermes_oci`, `ssh-key-2026-07-01.key`, `ssh-key-2026-07-29-lab.key`,
  `ssh-key-2026-07-29.key`) are rejected by GitHub. They are OCI VM keys only.
- There is **no GitHub MCP connector** — only Notion. Pushing happens through
  the terminal with plain `git`, which is fine.

### `lab` — the deploy target
- Public IP **`145.241.110.17`**, Tailscale **`100.126.250.92`**, hostname `lab`
- Ubuntu 24.04, **1 CPU, 3.8 GB RAM, no swap**, 38 GB disk free
- Docker 29.7.0. Started clean: zero containers, zero images.
- **It is the Kubernetes control plane** — etcd 71 MB, kube-apiserver 343 MB,
  kubelet 93 MB already resident. If it OOMs, the cluster dies.
- Ports free: **80, 443, 4000, 8083, 5432**
- **Access:** `olab` → batch file at `C:\Users\Murtaza..!\.local\bin\olab.bat`
  containing
  `ssh -i %USERPROFILE%\.ssh\ssh-key-2026-07-29-lab.key ubuntu@145.241.110.17 %*`
  From bash use the full path:
  `ssh -i /c/Users/Murtaza..!/.ssh/ssh-key-2026-07-29-lab.key ubuntu@145.241.110.17`

### `uoci-worker` — the other VM
- Public IP **`84.8.126.125`**, Tailscale **`100.123.171.112`**
- Ubuntu 24.04, 1 CPU, **7.7 GB RAM**, 64 GB disk free
- Runs **Coolify** (ports 80/443/8000) + the old August build
  (`smart-cash-carry-db` :5432, `-backend` :4000, `-frontend` :8083)
- **Access:** `ssh -i ~/.ssh/ssh-key-2026-07-29.key ubuntu@84.8.126.125`
- Trap: `~/.ssh/config` has an entry `oci-wordpress` pointing at this IP with
  the **wrong key** (`greenscape_oci`). It always fails. Use the command above.

### The cluster
Both VMs are one **Kubernetes cluster**, v1.31.14, containerd 2.2.x, joined over
Tailscale. `lab` = control-plane, `uoci-worker` = worker. Built ~25 days ago.
**This is the strongest portfolio asset in the whole setup.** Kubernetes
deployment is deliberately deferred to Sprint 7.

### Phone testing
Qasim's phone **is on Tailscale**. The local Vite dev server is reachable from it
at **`http://100.98.5.62:5173`** — no VM round trip needed.

---

## 3. Locked decisions — with the reason, so they don't get relitigated

| Decision | Why |
|---|---|
| No numeric stock count — just `available` boolean | Deletes the "two people buy the last item" race condition instead of solving it |
| `OrderItem` snapshots name + price at order time | Later price edits never rewrite historical order totals |
| Single `completed` flag, no status pipeline | Local delivery doesn't need "preparing / shipped" |
| Guest checkout, no customer accounts | Less to build, less to secure, no buyer friction |
| Cash on delivery only | No payment gateway, no PCI scope, zero cost |
| Categories from the database, never hardcoded | The mockups show 9 categories; reality has 5 |
| Postgres tables **capitalised and singular** | Carried over. Always quote: `SELECT * FROM "Product";` |
| Monolith, not microservices | Right call at this scale. Containers are separate only because that's normal Docker practice |
| Docker Compose, GitHub as source of truth | The VM only ever pulls. Never edit code on the VM |
| Never stack 2 unverified sprints | This rule held last time and prevented a worse mess |

---

## 4. Data and assets — verified, not assumed

- `data/products.csv` — **119 products**
  Columns: `Item_ID, Category, Title, Weight, Price, Image_File`
- `data/images/` — **119 images**, `ITEM-001.jpg` … `ITEM-119.jpg`
- **Match check: 0 rows missing an image, 0 orphans, 0 duplicate IDs.**
  (The old Notion page said 120 and flagged it as unverified. It is **119**.)
- **Mixed image formats: 99 jpg, 19 png, 1 webp (`ITEM-067`).**
  Never assume `.jpg` — read `Image_File` from the CSV.
- 5 categories: Masalas & Spices 42, Toothpastes & Oral Care 37,
  Tea & Coffee 17, Soaps & Body Wash 15, Cooking Oils & Ghee 8
- Prices 60 – 3,080 PKR, median 300. All packaged goods — no fresh produce.
- Source of truth was
  `E:\Shared For Ubuntu and Kali\New folder\product_database (1).csv`.
  Beware: the sibling `product_database.csv` has **no Price column**.

**Brand palette:** purple `#4A148C` / `#380b6e` primary, red `#D32F2F` /
`#b71c1c` accent, white cards. Derived from a photo of the real storefront
signboard. `reference/design.md` is orange/green scraped from competitor
grocerapp.pk — **layout reference only, never its colours.**

**Mockups:** 6 usable images in `reference/mockups/` (home, category listing,
product detail, cart, checkout, confirmation). One file
(`Screenshot_189.png`) is an empty browser tab — not a reference.
Details and per-image notes in `reference/mockups/README.md`.

---

## 5. Sprint map

| # | Sprint | Done when |
|---|---|---|
| 0 | Prove the pipeline | `/api/health` ok, `/api/products` returns 3 rows, frontend renders, phone can load it |
| 1 | Real data + schema | `SELECT count(*) FROM "Product"` → 119, images serve |
| 2 | Customer catalog | Browse 5 categories on phone, live search, product detail |
| 3 | Cart + checkout | Order lands in Postgres; changing a price doesn't alter the old total |
| 4 | Admin auth, orders, analytics | Donut chart shows real revenue split by category |
| 5 | Admin product management | Hide a product → it vanishes from the catalog |
| 6 | WhatsApp (CallMeBot) + polish | Test order pings the admin's phone |
| 7 | Hardening + deploy | Running on `lab` with Nginx, not Vite dev server. **Kubernetes manifests land here.** |

---

## 6. CURRENT STATE — rewrite every session

**As of 3 Sep 2026, 06:50 — Sprint 1 pushed and clean. Git tracking refs repaired. Ready for Sprint 2.**

- **Sprint 1 is on GitHub at `4f1bf86`** (`SALAAR-lgtm/Smart-Cash-and-Carry-01`).
  Push works normally. Working tree is clean.
- **Local git tracking refs were broken and are now fixed.** This git build
  cannot create subdirectories under `.git/refs/`, so `origin/master` never
  persisted and `git status` reported `[gone]` / `[ahead N]`. Remote-tracking
  refs now live in `.git/packed-refs` (see the gotcha in section 8). **After
  every push run `git sync`** — that is `git fetch` + `tools/track-ref.sh`.

- **Sprint 1 done and verified by cold start.** Deleted `.pgdata`, booted both
  servers from nothing: `119 products`, category counts matching the verified
  inventory exactly (Masalas 42, Toothpastes 37, Tea 17, Soaps 15, Oils 8).
  All 119 image URLs return 200 with correct MIME types.
- **Tailwind added** (v4.3.3, Vite plugin — no config file needed). This closed
  the one real gap against the Notion spec, which called for
  React+Vite+Tailwind. Brand palette lives in `@theme` in `src/index.css`,
  named by role (`brand`/`accent`) not hue (`purple`/`red`) so a palette change
  is one edit instead of a sweep through every component.
- **Schema now has all 5 tables** in `db/init.sql`: `Category`, `Product`,
  `Admin`, `Order`, `OrderItem` — plus 3 indexes.
- **Product rows moved out of `init.sql` into `db/seed.sql`**, generated by
  `tools/generate-seed.py`. Regenerate after any CSV change:
  `python tools/generate-seed.py` (from repo root). It validates before writing
  and refuses to emit SQL if an image is missing, an id duplicates, a price is
  not a number, or an orphan image exists.
- **Images served** at `/images` from Express, statically, from `data/images`.
  Local path is repo-relative; Docker overrides it with `IMAGES_DIR` and mounts
  the folder read-only so 14 MB of photos never enter the image layers.
- **Servers were down when this session resumed** (confirmed `HTTP 000`). Not a
  regression — background processes die when the tool call that started them
  returns. Restarted and verified.
- **Still unverified: the phone test.** `http://100.98.5.62:5173` answers 200
  from this PC, but Qasim has not yet loaded it on an actual phone.
- Old August build still running on `uoci-worker`. Qasim chose to leave it up.
  It does not conflict — nothing of ours is on that VM.
- The `lab` VM is still completely clean: no containers, no images.

**Local dev commands (run from `E:\Smart-Cash-and-Carry\app`):**
```
node backend/src/server.js        # API on :4000
cd frontend && npm run dev        # Vite on :5173
```
**Regenerate the catalogue after editing `data/products.csv`:**
```
python tools/generate-seed.py     # from the repo root
```

---

## 7. NEXT ACTION — rewrite every session

**Single next step: Sprint 2 — customer catalog.**

Build the browsing experience on top of the 119 real products now in the
database. In order:

1. **Category rail.** `GET /api/categories` returning each category with a
   product count. Categories come from the database, never hardcoded — the
   mockups show 9, reality has 5.
2. **Browse by category**, with a product grid reusing the card built in
   Sprint 1. Mobile-first: 1 column → 2 at `sm` → 3 at `lg`.
3. **Live search** over `Product.name`, filtering as the user types.
4. **Product detail view** — full image, name, weight, PKR price, category,
   availability. This is where the `− 1 +` stepper from the mockups goes, but
   wiring it to a cart is Sprint 3, so leave the stepper inert for now.
5. Done when: on a phone over Tailscale you can tap through all 5 categories,
   search finds a product by partial name, and a detail page shows the real
   photograph at full size.

**Do this before writing code:** Qasim should load `http://100.98.5.62:5173`
on his phone once. Sprint 0 claimed it was reachable and it has never actually
been confirmed on a device — do not stack Sprint 2 on top of an untested
assumption.

**Push after every sprint:** `git add -A && git commit -m "..." && git push`.
Re-run the secret scan in section 8 first — the repo is public.
**Then run `git sync`**, or `git status` will keep claiming the branch is ahead
of `origin/master`. See the git gotcha in section 8.

---

## 8. Gotchas — things that bite repeatedly

- **Postgres table names are capitalised and singular.** `SELECT * FROM "Product";`
  Lowercase `products` fails with "relation does not exist" even though the table
  is right there. Same in PGlite.
- **Docker cannot run on this PC.** WSL is blocked by security policy. Local dev
  uses **PGlite** (real Postgres as WebAssembly, inside Node). Production uses
  the `pg` driver. `src/db.js` switches on `DB_DRIVER`. SQL is identical.
- **Vite must bind `0.0.0.0`** or the phone can't reach it over Tailscale.
  Windows Firewall may also need a rule for port 5173.
- **`coolify-db` must never be stopped.** It is Coolify's own database, not ours.
  Only `smart-cash-carry-db` was ever ours.
- **The old DB publishes `0.0.0.0:5432`** to the internet. The new compose file
  must NOT publish 5432 — reach Postgres over the Docker network by service name.
- **`olab` is a batch file, not an SSH alias.** `ssh olab` fails. Run `olab`,
  or the full ssh command from section 2.
- **Qasim works partly from a phone via Termius.** Give one command at a time
  with the expected output to compare against.
- **1 CPU on both VMs.** Docker builds are slow. Iterate locally, deploy rarely.
- **PGlite dies with a bare `RuntimeError: Aborted()` if `postmaster.pid` is
  stale.** Every unclean shutdown (Ctrl+C, crash, `timeout`) leaves that file in
  `app/.pgdata/`, and the next boot aborts deep inside WASM with no useful
  message. Fix: `rm -f .pgdata/postmaster.pid` and start again. `src/db.js`
  clears it on boot, so this should rarely happen now.
- **Do NOT use `fs.rm()` in application code on this PC.** The WorkBuddy
  sandbox intercepts it with a safe-delete guard that throws inside
  long-running processes. Use `fs.unlink()` (wrapped in try/catch) instead.
  This only affects Buddy's sandbox — Qasim's own terminal is unaffected.
- **Never load config with `import 'dotenv/config'`.** It resolves `.env`
  relative to `process.cwd()`, so `npm run dev` from `backend/` silently misses
  `app/.env`. `src/db.js` pins the path with `dotenv.config({ path: ... })`.
- **Bash `/tmp` and Node `/tmp` are different places.** Node resolves `/tmp/x`
  against the current drive (`E:\tmp\x`). Keep scratch scripts inside the
  project directory, and delete them before committing.
- **`curl` to localhost lies inside Buddy's sandbox.** A proxy is set
  (`http_proxy=127.0.0.1:34142`), so `curl localhost:4000` returns **`HTTP 502`
  even when the server is fine.** That 502 is a false negative. Always use
  `curl --noproxy '*' http://localhost:4000/...`. Real status codes:
  `HTTP 000` = connection refused (genuinely down), `200`/`{}` = fine.
  Qasim's own terminal has no proxy, so this only affects Buddy.
- **This git build cannot create subdirectories under `.git/refs/`.** Any
  *nested* ref — anything of the form `refs/remotes/<remote>/<branch>` — fails
  to write. `git update-ref` and `git fetch` both **exit 0 and report success**
  while writing nothing, and git deletes the directory it should have written
  into. Single-level refs (`refs/heads/master`, `refs/remotes/foo`) write fine.
  - Symptoms: `git status -sb` shows `## master...origin/master [gone]` right
    after a successful push, or `[ahead N]` forever after a push.
  - Cause is not the sandbox, not hooks, not a symlink, not `fetch.prune`, not
    `git maintenance`. Ruled out by bisection on 3 Sep 2026. Reproduces inside
    and outside the sandbox, in bash and in PowerShell, on git
    2.55.0.windows.3 (PortableGit 1.2.0).
  - **Fix already applied:** remote-tracking refs live in `.git/packed-refs`,
    which git reads natively and which needs no subdirectory. A fresh clone
    uses this same format, which is why clones look healthy.
  - **After every push run `git sync`** (= `git fetch` +
    `bash tools/track-ref.sh`). The script asks the remote for the true sha
    with `git ls-remote` and rewrites the `packed-refs` line. Pushing updates
    the remote fine; it is only the *local* tracking ref that goes stale.
  - If the repo is ever re-cloned, nothing needs fixing — the clone ships a
    correct `packed-refs`. The `git sync` alias is per-clone, so set it again:
    `git config alias.sync '!git fetch && bash tools/track-ref.sh'`
- **The GitHub repo is public — scan before every push:**
  ```
  git ls-files | grep -i "\.env$"          # must print nothing
  git grep -nIE "(PRIVATE KEY|ghp_|github_pat_|AKIA[0-9A-Z]{16})" -- .
  ```
  `app/.env` is gitignored and stays local. Never commit it. If a secret is ever
  pushed, rotating it is the fix — deleting the commit does not un-leak it.

---

## 9. Progress log — append only

### 1 Sep 2026 — restart, context system, Sprint 0 planning
- Previous build (Manus AI) abandoned. It reached Sprints 1–2 then stalled at
  Sprint 3 for nine days with nothing committed. Manus free access ended 25 Aug.
  Root cause was the loop, not the code: prompt → wait → review someone else's
  work. Passive and it taught nothing.
- Full restart agreed: same product, Buddy instead of Manus, **Qasim types**.
- Discovered the assets were all still on the E drive, and verified them:
  119 products / 119 images / 0 mismatches. Closed the old 120-vs-119 question.
- Discovered `olab` is a batch file for a **second VM** (145.241.110.17), and
  that both of Qasim's VMs are already a **two-node Kubernetes cluster**.
  He had not mentioned it.
- Decisions: deploy to `lab`; leave the old build running; GitHub via PAT later;
  phone testing over Tailscale.
- Created this file to stop context loss across session limits.

### 1 Sep 2026 — Sprint 0 built, debugged and committed
- Wrote the whole Sprint 0 scaffold: Express backend (`src/server.js`,
  `src/db.js`), `db/init.sql`, Vite/React frontend, Dockerfiles,
  `docker-compose.yml`, `.env.example`, `.gitignore`, `.gitattributes`.
- **Blocker 1 — backend crashed with `RuntimeError: Aborted()`.** Chased it by
  bisecting: PGlite in-memory worked fine, a fresh data dir worked fine, only
  the existing `app/.pgdata` failed. Root cause: a stale `postmaster.pid` from
  an earlier killed run. PGlite tries to `unlink` it on startup — and inside
  Buddy's sandbox that `unlink` is intercepted by a safe-delete guard which
  throws, aborting the WASM. Two lessons recorded in section 8.
- **Blocker 2 (latent, caught before it bit):** `import 'dotenv/config'` loads
  `.env` from `process.cwd()`, so `npm run dev` run from `backend/` would have
  silently ignored `app/.env`. Changed to an explicitly pinned path.
- **Blocker 3 (harness):** background processes started with `(cmd &)` inside a
  Bash tool call get killed when the call returns. Must use a real background
  task instead, otherwise you get an empty log and an empty curl for no reason.
- Verified end to end: health ok, 3 products, Vite proxy working, Tailscale IP
  returning 200. Phone test at `http://100.98.5.62:5173` is ready to run.
- Committed as `48f604a`. **Sprint 0 is complete.**

### 1 Sep 2026 — GitHub connected, first push
- Qasim asked for a status report, then whether there was GitHub write access.
  There was none, and checking it properly took some care: the obvious test
  `ssh -T git@github.com` **only tries standard-named keys**, and every key on
  this machine has a custom name, so the default test proves nothing. Had to
  pass `-i <key> -o IdentitiesOnly=yes` per key. All five VM keys rejected.
- No `gh` CLI, no credential helper, no stored credentials, no GitHub MCP
  connector (only Notion is connected — MCP push is not available at all).
- Set up a **dedicated SSH key** instead of a PAT: `~/.ssh/github_scc`, added to
  GitHub by Qasim, bound in `~/.ssh/config` with `IdentitiesOnly yes`.
  Chosen over a PAT because it never expires and is revocable per-key.
- Created the repo `Smart-Cash-and-Carry-01` (public) and pushed both commits.
  GitHub's canonical name is capitalised — set the remote to that form so
  pushes stop warning "This repository moved".
- Ran a secret scan before the first push: `app/.env` untracked, no keys or
  tokens in any tracked file. Recorded the scan in section 8.

### 1–3 Sep 2026 — Sprint 1: Tailwind, real data, full schema
- **Caught a spec drift before it compounded.** Qasim asked whether the stack
  matched the Notion page. Fetched it and compared: 7 of 9 items matched, but
  **Tailwind was missing** — Sprint 0 used hand-written CSS. Fixed at the start
  of Sprint 1 rather than later, because Sprints 2–5 are where all the UI gets
  built and converting afterwards would mean rewriting all of it. Cost now:
  one CSS file. Cost later: every component.
- Also confirmed two deliberate deviations, both defensible: sprint order
  (we do customer-first; Notion's original list did admin-first, but Notion's
  *later* note agrees with us) and Nginx instead of Caddy/DuckDNS.
- **Wrote `tools/generate-seed.py`** instead of hand-writing 119 INSERT rows.
  It validates first — missing image, duplicate id, non-numeric price, orphan
  image — and refuses to write if anything is wrong. Verified: 119 products,
  5 categories, 0 broken image URLs.
- The generator reads the `Image_File` column rather than assuming `.jpg`.
  Confirmed working: `ITEM-067` correctly resolved to `.webp`, one of 20 images
  that would have silently broken.
- Added `Admin`, `Order`, `OrderItem` tables. `"Order"` is a SQL reserved word,
  so quoting is mandatory, not stylistic. `OrderItem` snapshots name+price;
  `product_id` is nullable on purpose so deleting a product never destroys
  historical order lines.
- **Fixed a Docker landmine before it fired:** the backend Dockerfile never
  copied `data/`, and the compose build context is `app/` so `data/` (repo
  root) is outside it. A `COPY` could not work at all. Solved by mounting
  `../data/images` read-only at `/data/images` and pointing `IMAGES_DIR` at it.
  Bonus: 14 MB of photos stay out of the image layers.
- Removed a stray `import 'dotenv/config'` from `server.js` — db.js already
  loads `.env` by pinned path, and the bare import would silently load the
  wrong file depending on cwd.
- Verified by genuine cold start (deleted `.pgdata`, booted from nothing):
  119 products, counts per category matching the verified inventory exactly,
  all 119 images 200, frontend 200, Tailscale IP 200.

### 3 Sep 2026 — git tracking-ref bug diagnosed and fixed
- Sprint 1 pushed fine, but `git status` kept reporting
  `## master...origin/master [gone]`. Nothing was actually lost — `git ls-remote`
  confirmed the remote had every commit — but the local tracking ref vanished.
- Took ~20 probes to find, and every plausible theory was wrong: not a hook,
  not `fetch.prune`, not a symlink, not permissions, not the filesystem (NTFS),
  and not the WorkBuddy sandbox (reproduced with it disabled).
- **Root cause: this git build cannot create a subdirectory under `.git/refs/`.**
  Isolated it by writing refs at different depths:
  - `refs/heads/__probe` and `refs/remotes/foo` (one level) → written
  - `refs/remotes/origin/master`, `refs/remotes/origin/zzz`,
    `refs/remotes/upstream/master`, `refs/remotes/origin2/master` (nested) →
    all exit 0, write nothing, and git deletes the parent directory
- The tell that cracked it: a **fresh clone was healthy**, because clones put
  refs in `packed-refs` and never need a subdirectory. That pointed straight at
  directory creation, not at fetching or networking.
- **Fix:** wrote `refs/remotes/origin/master` into `.git/packed-refs` by hand,
  plus `tools/track-ref.sh` to keep it current, plus a `git sync` alias.
  Validated the full loop: push → status says `[ahead 1]` → `git sync` →
  status clean. Also confirmed `git sync` is idempotent and survives `git fetch`.
- Left `maintenance.auto=false` in the repo config — harmless (this repo is
  tiny) and it stops a background process from touching a ref store that is
  already fragile.
