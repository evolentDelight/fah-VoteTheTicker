# VoteTheTicker

A verified-human club Mini App for the [Alien](https://docs.alien.org/) ecosystem. Combines AI-assisted stock candidate discovery, democratic voting (one-human-one-vote), high-signal discussion with pinned messages, and tamper-evident decision receipts.

## Tech Stack

- **Frontend:** Vite + React (JavaScript)
- **Styling:** Tailwind CSS via CDN (no Tailwind build step)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Platform:** Alien Mini App (web app in Alien WebView) with Alien SSO for verified identity

## Quick Start

### Option A: PostgreSQL in Docker

```bash
# Start PostgreSQL in a container (from project root)
docker compose up -d postgres

# Copy .env.example to .env (server loads it from project root so DATABASE_URL is set for Docker Postgres).

# Install dependencies and run the app
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
npm run dev
```

Stop the DB when done: `docker compose down`. Data is kept in a Docker volume (`votetheticker_pgdata`).

### Option B: Local PostgreSQL (no Docker)

```bash
# Create a database (if local Postgres is installed)
createdb votetheticker

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Run dev (backend + frontend)
# Optional: set DATABASE_URL if not using postgresql://localhost:5432/votetheticker
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (proxies API to backend)

**Environment (server):**

| Variable       | Description                                      | Default (if unset)                    |
|----------------|--------------------------------------------------|---------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string                     | `postgresql://localhost:5432/votetheticker` |
| `PORT`         | Server port                                     | `3001`                                |

On first start, the server runs the schema (creates tables and indexes) automatically.

## Alien Integration

- **Auth:** The Alien host injects a JWT via `window.__ALIEN_AUTH_TOKEN__`. This app reads it and sends it in the `Authorization` header.
- **Token verification:** Backend uses `@alien_org/auth-client` to verify tokens and extract `sub` (Alien ID). Install it:
  ```bash
  cd server && npm install @alien_org/auth-client
  ```
  If unavailable, you can add a dev bypass or use `jose` to verify JWTs from `https://sso.alien-api.com/oauth/jwks`.

## Core Loop

1. Discover a public club and submit a join request with a **reason for interest**
2. Admin approves → user becomes a member
3. Agent generates a proposal (3 candidates) from the club's watchlist with **risk summaries**
4. Members vote **Buy / Watch / Pass** (one-human-one-vote)
5. Club publishes a **Decision Receipt** (immutable, hash-linked)
6. Discussion tab supports debate with pinned messages

## API Overview

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/clubs` | no | List public clubs |
| `GET /api/clubs/:slug` | no | Club profile |
| `POST /api/clubs` | yes | Create club |
| `GET /api/clubs/:slug/member` | yes | My membership status |
| `POST /api/clubs/:slug/join` | yes | Request to join (reason_for_interest) |
| `POST /api/clubs/:slug/approve/:memberId` | yes (mod) | Approve join request |
| `GET /api/clubs/:slug/watchlist` | yes | Club watchlist |
| `POST /api/clubs/:slug/watchlist` | yes | Add ticker |
| `POST /api/clubs/:slug/proposals/generate` | yes | Agent generates proposal |
| `GET /api/clubs/:slug/proposals` | yes | List proposals |
| `GET /api/proposals/:id` | yes | Proposal detail |
| `POST /api/proposals/:id/vote` | yes | Vote (buy/watch/pass) |
| `POST /api/proposals/:id/publish` | yes (owner/mod) | Publish decision receipt |
| `GET /api/proposals/:id/receipt` | yes | Get receipt |
| `GET /api/clubs/:slug/discussion` | yes | Discussion messages |
| `POST /api/clubs/:slug/discussion` | yes | Post message |
| `POST /api/clubs/:slug/discussion/:id/pin` | yes (mod) | Pin message |

## Deploy on Render

### PostgreSQL on Render

1. **Add a PostgreSQL database:** In Render Dashboard → New → PostgreSQL. Create a DB and note the **Internal Database URL** (or External if you need it from outside Render).
2. **Web Service:** New → Web Service. Connect your repo.
3. **Environment:** Add `DATABASE_URL` and paste the PostgreSQL connection string (from the DB’s “Connect” / “Internal Database URL”).
4. **Build Command:** `npm run render:build`  
5. **Start Command:** `npm run render:start`  
6. Deploy. On first start, the server runs the schema and creates all tables automatically. Data persists across deploys.

**Optional – Blueprint:** If you use a `render.yaml` (Blueprint), the repo includes one. In Render Dashboard: New → Blueprint, connect the repo, and use the generated service (you can set Build Command to `npm run render:build` and Start Command to `npm run render:start` in the service settings).

## Safety & Disclaimers

- Not financial advice. Educational only.
- Risk and unknowns included in every agent output.
- Club content private by default; pseudonyms supported.
