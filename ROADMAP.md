# Smart Cash & Carry — Rebuild Roadmap

**Started:** 31 Aug 2026
**Location:** `E:\Smart-Cash-and-Carry`
**Builder:** Qasim (types the commands) + Buddy (unblocks, reviews, explains)
**Deploy target:** Oracle Cloud Free Tier VM, Ampere A1, Ubuntu — `84.8.126.125`

---

## Why we restarted

Manus free access ended 25 Aug 2026. The old build got through Sprints 1–2
(skeleton + admin panel) and stalled at Sprint 3 for nine days.

The stall wasn't caused by bad code. It was caused by the **loop**:
send a prompt → wait hours → review something someone else built.
Reviewing is passive, waiting is boring, and neither teaches you anything.
Rebuilding the same loop with a different AI would stall again in three weeks.

**So the loop changes:** you type, I unblock. The app is the excuse;
the skill is the point.

---

## What we keep from the old build

Two months of decisions were not wasted. These carry over untouched:

| Kept | Why it was right |
|---|---|
| No numeric stock count — just an `available` boolean | Deletes the "two people buy the last item" race condition instead of solving it |
| `OrderItem` snapshots name + price at order time | Editing a price later never rewrites historical order totals |
| One `completed` flag, no status pipeline | Local delivery doesn't need "preparing / shipped" |
| Guest checkout — no customer accounts | Less to build, less to secure, no friction for buyers |
| Cash on delivery only | No payment gateway, no PCI scope, zero cost |
| 5-table data model | Already normalised correctly |
| Docker + compose, GitHub as source of truth | Standard, portable, free |

Carried-over gotcha, now permanent knowledge: **Postgres table names are
capitalised and singular.** Always quote them: `SELECT * FROM "Product";`
Lowercase fails even when the table exists.

## What changes

1. **No deadline.** Nothing here expires.
2. **Local Docker verification before the VM.** Docker Desktop is on this PC.
   We prove containers run *here* first. The VM becomes the final check,
   not the first — which is how real dev → staging works.
3. **Admin panel moved later.** It was Sprint 2; now it's Sprint 4–5.
   Admin is the least demo-able part of the app. The customer-facing side
   is what goes in your portfolio and what the mart owner actually sees.
4. **Analytics dashboard added** — your new requirement from the Qwen session.
5. **You type the commands.**

---

## Verified assets (checked 31 Aug, not assumed)

| Asset | Status |
|---|---|
| `data/products.csv` | **119 products**, columns `Item_ID, Category, Title, Weight, Price, Image_File` |
| `data/images/` | **119 images**, `ITEM-001.jpg` … `ITEM-119.jpg` |
| Match check | **0 rows missing an image, 0 orphan images, 0 duplicate IDs** |
| Categories | 5 — Masalas & Spices (42), Oral Care (37), Tea & Coffee (17), Soaps & Body Wash (15), Cooking Oils & Ghee (8) |
| Prices | 60 – 3,080 PKR, median 300 PKR |

This closes the old project's open gotcha. The Notion page said "120 products,
verify the count matches." The real number is **119**, and it matches exactly.

Two notes:
- Images are mixed format — 99 jpg, 19 png, **1 webp** (`ITEM-067`). Browsers
  handle all three fine, but the seed script must not assume `.jpg`.
- No fresh produce, dairy or bakery — all 119 items are packaged goods.
  Fine for an MVP; worth expanding later.

---

## Design direction

Two sources disagreed, so here's the resolution:

- **Brand colours: purple + red.** `reference/smart-mart-with-logo.html` uses
  `#4A148C` / `#380b6e` purple with `#D32F2F` / `#b71c1c` red. This came from
  the photo of the real storefront signboard. It's the actual brand. Keep it.
- **`reference/design.md`: layout reference only.** It's a design system
  scraped from grocerapp.pk (orange `#EE7E25` + green `#51AA1A`). Ignore its
  colours. Steal its structure: 8px grid, card-based product tiles,
  mobile-first, strong price signalling, skeleton loading states.

Purple header, white cards, red prices and checkout button.

---

## The sprints

Each sprint ends with something **running and visible**. That is not
optional — it's the rule that prevents another stall.

### Sprint 0 — Prove the pipeline
*Goal: one request travelling browser → Express → Postgres → back.*

Set up Docker Desktop, `git init`, new GitHub repo, and the three-container
skeleton (db / backend / frontend). Seed **3** products only.

**Done when:** `docker compose up` runs locally, `curl localhost:4000/api/health`
returns `{"status":"ok"}`, and `/api/products` returns 3 real rows with PKR prices.

**You learn:** what a container is, what compose does, what an endpoint is.

### Sprint 1 — Real data
Full schema (5 tables) + a seed script that loads all 119 products and serves
images as static files from the backend.

**Done when:** `SELECT count(*) FROM "Product";` returns **119**, and
`http://localhost:4000/images/ITEM-001.jpg` opens in your browser.

### Sprint 2 — Customer catalog
Home page, category browsing, live search, product detail page. Mobile-first,
purple/red, built against your 7 mockups in `reference/mockups/`.

**Done when:** you can browse all 5 categories on your phone, search "Sufi"
and get live results, and tap through to a product detail page.

*This is the sprint that stalled last time. It's the one that matters most.*

### Sprint 3 — Cart, checkout, confirmation
Add to cart, cart drawer with badge, guest form (Name / Phone / Address),
place order, confirmation screen. Prices snapshot into `OrderItem`.

**Done when:** you place a real order and can see it in Postgres with the
correct total — then change a product's price and confirm the old order
total did **not** move.

### Sprint 4 — Admin: auth + orders + analytics
Password login (bcrypt + JWT), order list, single "Completed" toggle, and
the **analytics dashboard**: revenue split by category (donut chart) plus a
recent-orders table.

**Done when:** after a handful of test orders, the donut chart shows a real
revenue split across your 5 categories.

*Analytics comes before product CRUD on purpose — it's the part that's
genuinely exciting to look at, and it needs order data to exist first.*

### Sprint 5 — Admin: product management
Add / edit / delete products, availability toggle, image upload from phone.

**Done when:** you hide a product in admin and it disappears from the
customer catalog immediately.

### Sprint 6 — WhatsApp + mobile polish
CallMeBot ping to the admin on every new order. Accessibility and
mobile-first polish pass.

**Done when:** placing a test order sends a WhatsApp message to your phone.

### Sprint 7 — Production hardening
Replace Vite's dev server with a real Nginx production build, lock down env
vars, confirm only port 8083 is exposed, deploy to the OCI VM.

**Done when:** the app runs on `http://84.8.126.125:8083` from your phone,
on real infrastructure, with no dev server anywhere.

---

## Working rules (the anti-stall rules)

1. **No session ends in "waiting for something."** It ends running.
2. **30–45 minutes per session,** stopped at a working state.
3. **You type.** I give one step at a time with the expected output to compare.
4. **Never stack two unverified sprints.** This rule held last time — keep it.
5. **Stuck more than 15 minutes → I take the keyboard.** Then I explain what I did.
6. **Commit at the end of every session,** even if it's small.
7. If a step is pure boilerplate with nothing to learn, say so and I'll do it.

## Definition of done (whole project)

- Customer can browse, search, add to cart and order on a phone.
- Admin can log in, manage products, mark orders complete.
- Dashboard shows real revenue by category.
- WhatsApp ping arrives on a new order.
- Running on the OCI VM at `http://84.8.126.125:8083`.
- Public GitHub repo with a real README — this is the portfolio piece.
