import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/votetheticker';
const pool = new Pool({ connectionString });

const schema = `
-- Users (Alien ID → local user)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  alien_id TEXT UNIQUE NOT NULL,
  pseudonym TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id),
  is_public INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club membership (pending = join request)
CREATE TABLE IF NOT EXISTS club_members (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'moderator', 'member', 'risk_officer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason_for_interest TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(club_id, user_id)
);

-- Club watchlist (tickers)
CREATE TABLE IF NOT EXISTS watchlist (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id),
  ticker TEXT NOT NULL,
  added_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, ticker)
);

-- Proposals (agent-generated)
CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id),
  requested_by_user_id INTEGER NOT NULL REFERENCES users(id),
  version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'voting', 'finalized', 'published')),
  thesis_summary TEXT,
  data_as_of TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  voting_ends_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

-- Proposal candidates (3 per proposal)
CREATE TABLE IF NOT EXISTS proposal_candidates (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id),
  ticker TEXT NOT NULL,
  thesis_bullets TEXT,
  risk_bullets TEXT,
  unknowns TEXT,
  confidence TEXT,
  reasoning TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Votes (one per user per candidate)
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  proposal_candidate_id INTEGER NOT NULL REFERENCES proposal_candidates(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  vote TEXT NOT NULL CHECK (vote IN ('buy', 'watch', 'pass')),
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_candidate_id, user_id)
);

-- Decision receipts (immutable, hash-linked)
CREATE TABLE IF NOT EXISTS decision_receipts (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL UNIQUE REFERENCES proposals(id),
  content_hash TEXT NOT NULL,
  prev_receipt_hash TEXT,
  payload TEXT,
  signed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion messages
CREATE TABLE IF NOT EXISTS discussion_messages (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES clubs(id),
  proposal_id INTEGER REFERENCES proposals(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  pinned_at TIMESTAMPTZ,
  pinned_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_club ON watchlist(club_id);
CREATE INDEX IF NOT EXISTS idx_proposals_club ON proposals(club_id);
CREATE INDEX IF NOT EXISTS idx_proposal_candidates_proposal ON proposal_candidates(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(proposal_candidate_id);
CREATE INDEX IF NOT EXISTS idx_discussion_club ON discussion_messages(club_id);
`;

let schemaRun = false;
export async function ensureSchema() {
  if (schemaRun) return;
  const client = await pool.connect();
  try {
    await client.query(schema);
    schemaRun = true;
  } finally {
    client.release();
  }
}

export function query(text, params) {
  return pool.query(text, params);
}

export default pool;
