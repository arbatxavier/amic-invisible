# Amic Invisible 🎄🎁

A **fullstack** web app to run a "Secret Santa" (Amic Invisible) draw for family or friends, with secret gift assignment and automatic WhatsApp delivery. Built with **Next.js (App Router) + TypeScript + Tailwind CSS**, ready to deploy with **Docker** (`output: 'standalone'`).

> Designed to be deployed on a Hetzner server with **Coolify**, but works with any Docker setup.

---

## Features

- **Secret draw** powered by a *backtracking* engine with the **MRV** (Minimum Remaining Values) heuristic.
- **Shared-phone rule**: if two people in the same event share a phone number (e.g. mother and daughter), bidirectional exclusions (`SAME_PHONE`) are created automatically so they never draw each other.
- **Anti-spoiler**: the public `/r/[token]` page **never** returns or renders who the person is drawing for until they tap "Reveal". The name is only obtained (and marked as viewed) via `POST /api/r/[token]/reveal`.
- **Admin panel** `/admin` protected by a password with an HTTP-only cookie.
- **WhatsApp** integrated with [WAHA](https://waha.devlike.pro/) (`default` session), with a send queue driven from the frontend and a `wa.me` button fallback.
- **Festive and mobile-first**: Framer Motion, canvas-confetti, a 3D card, burgundy / forest green / gold palette.
- **i18n**: the UI automatically switches between **Catalan** and **Spanish** based on the device language.

---

## Tech stack

| Layer | Technology |
|------|-----------|
| Framework | Next.js 15 (App Router, RSC, Route Handlers) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion + canvas-confetti |
| Database | SQLite with `better-sqlite3` + Drizzle ORM |
| Identifiers | nanoid (24-char tokens) |
| WhatsApp | WAHA (`devlikeapro/waha`) over its HTTP API |
| Deploy | Docker (`output: 'standalone'`) |

---

## How it works

### Data model

Three tables (created automatically with `CREATE TABLE IF NOT EXISTS` when the connection starts):

- **`events`**: `id`, `title`, `eventDate`, `location`, `budget`, `rules`, `status` (`DRAFT | ACTIVE | ARCHIVED`), `avoidTwoCycles` (boolean), `messageTemplate`.
- **`participants`**: `id`, `eventId`, `name`, `phone` (normalized to E.164 without `+`, e.g. `34600112233`, **not unique**), `token` (nanoid 24), `assignedToId` (nullable), `whatsappStatus` (`PENDING | SENT | FAILED`), `whatsappSentAt`, `viewedAt`.
- **`exclusions`**: `id`, `eventId`, `giverId`, `receiverId`, `reason` (`SAME_PHONE | MANUAL`).

### Draw engine (`src/lib/draw.ts`)

Backtracking algorithm with the MRV heuristic that respects:

1. **Self-exclusion** (nobody draws themselves).
2. **`SAME_PHONE` exclusions** (shared phone).
3. **`MANUAL` exclusions** (defined by the admin).
4. **`avoidTwoCycles`** (prevents A→B and B→A).
5. History of previous draws (optional, via parameter).

If the graph has no solution, it returns a descriptive error.

### Anti-spoiler

- `GET /r/[token]` and `generateMetadata` **only** return public data (participant name and event details). **Never** `assignedTo`, and they never modify `viewedAt`.
- The recipient is obtained **only** when tapping "Reveal", via `POST /api/r/[token]/reveal`, which marks `viewedAt` and returns the name.

### WhatsApp

WAHA is **self-hosted, open-source and free** (Community tier). It runs as a Docker container on *your* server and connects to **your own WhatsApp account** (via WhatsApp Web): you scan the QR code once with your phone. No external platform, no paid subscription.

- The `WAHA_API_KEY` is **not** a third-party key: it is a secret **you make up** to protect the local HTTP API (passed to the container as `WHATSAPP_API_KEY`).
- No tunneling is needed: the app talks to WAHA over the internal Docker network (`http://waha:3000`).
- The admin links the number by scanning the **QR** shown in `/admin` (a proxy to WAHA, `default` session).
- Sending is done **call by call** from the frontend: each participant triggers `POST /api/admin/participants/[id]/send-whatsapp` with a **random 3–5 s delay** between messages.
- It always uses `session: "default"` and `chatId: "{phone}@c.us"`.
- On failure it marks `whatsappStatus = FAILED` and returns a `wa.me` fallback link.

---

## Local development

Requirements: Node 18.18+ (or Bun) and Docker for WAHA.

```bash
# 1. Dependencies
npm install        # or: bun install

# 2. Environment variables
cp .env.example .env
# edit ADMIN_PASSWORD, APP_URL, WAHA_URL, WAHA_API_KEY

# 3. Database (created automatically on boot, at ./data/amic.db)

# 4. Run WAHA
docker run --rm -p 3001:3000 -e WHATSAPP_API_KEY=yourkey \
  -v "$(pwd)/waha-data:/app/.sessions" devlikeapro/waha

# 5. Run the app
npm run dev       # http://localhost:3000
```

Use `WAHA_URL=http://localhost:3001` locally (so the app can reach WAHA from your machine).

---

## Docker deployment

```bash
# Build
docker build -t amic-invisible .

# Or run app + WAHA with docker-compose
ADMIN_PASSWORD=yourpassword WAHA_API_KEY=yourkey docker compose up -d
```

Services:

- `app` → Next.js on `:3000` (persistent volume `./data`).
- `waha` → WAHA on `:3001` (persistent volume `./waha-data`).

---

## Deploy on Hetzner + Coolify

1. Push this repo to GitHub/GitLab and create it in **Coolify** (it auto-detects the `Dockerfile`), pointing at the subdomain **amic.xavierarbat.com**.
2. Configure the environment variables (see `.env.example`):
   - `ADMIN_PASSWORD` → admin panel password.
   - `APP_URL` → `https://amic.xavierarbat.com` (used for private links).
   - `WAHA_URL` → `http://waha:3000` (internal service name).
   - `WAHA_API_KEY` → same key you set on the WAHA container (`WHATSAPP_API_KEY`).
3. Add persistent volumes:
   - `./data:/app/data` (SQLite).
   - `./waha-data:/app/.sessions` (WhatsApp sessions).
4. Deploy, open `/admin`, link WhatsApp with the QR and create your first event.

---

## Using the `/admin` panel

1. **Create event**: title, date (day only, optional), location (optional), budget, rules and (optional) message template.
2. **Add participants**: one per line in the format `Name, phone` (the phone is normalized automatically).
3. **Exclusions**: shared-phone exclusions are automatic; you can add extra manual exclusions.
4. **Run the draw**: executes the engine. The event becomes `ACTIVE`.
5. **Send WhatsApp**: sends all messages in a queue (3–5 s delay between them) or one by one. Each participant receives their private `/r/[token]` link.
6. **Anti-spoiler**: when enabled, not even the admin sees the assignments.

Each participant receives a unique link. Opening it shows their card and lets them **reveal** their gift (with confetti) by tapping the mystery card.

---

## Environment variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite file path | `/app/data/amic.db` |
| `ADMIN_PASSWORD` | Admin panel password | `change-this-password` |
| `APP_URL` | Public URL (for private links) | `https://amic.xavierarbat.com` |
| `WAHA_URL` | Internal WAHA URL | `http://waha:3000` |
| `WAHA_API_KEY` | WAHA API key (your own secret) | `change-this-api-key` |

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/…        # login, events, participants, exclusions, draw, send-whatsapp, waha/qr
│   │   └── r/[token]/…    # reveal (POST)
│   ├── admin/             # admin panel + login
│   ├── r/[token]/         # public reveal card
│   ├── page.tsx           # landing
│   └── layout.tsx         # root layout + fonts
├── components/
│   ├── AdminPanel.tsx     # admin UI (client)
│   ├── LoginForm.tsx      # login form (client)
│   └── RevealClient.tsx   # 3D reveal card (client)
├── lib/
│   ├── db/                # better-sqlite3 connection + Drizzle schema + auto-create
│   ├── i18n.ts            # Catalan/Spanish dictionaries + device-language detection
│   ├── draw.ts            # draw engine (MRV + backtracking)
│   ├── phone.ts           # phone normalization
│   ├── whatsapp.ts        # WAHA client
│   ├── template.ts        # WhatsApp message template
│   ├── repo.ts            # data-access helpers
│   └── auth.ts            # password hash / cookie
└── middleware.ts          # protects /admin and /api/admin
```
