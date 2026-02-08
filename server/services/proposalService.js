import pool from '../db.js';
import crypto from 'crypto';

function hashContent(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function createProposal(clubId, requestedByUserId, candidates, thesisSummary) {
  const dataAsOf = new Date().toISOString();
  const proposalR = await pool.query(`
    INSERT INTO proposals (club_id, requested_by_user_id, thesis_summary, data_as_of, status)
    VALUES ($1, $2, $3, $4, 'draft') RETURNING *
  `, [clubId, requestedByUserId, thesisSummary, dataAsOf]);
  const proposal = proposalR.rows[0];
  const proposalId = proposal.id;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    await pool.query(`
      INSERT INTO proposal_candidates (proposal_id, ticker, thesis_bullets, risk_bullets, unknowns, confidence, reasoning, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      proposalId,
      c.ticker,
      JSON.stringify(c.thesis_bullets || []),
      JSON.stringify(c.risk_bullets || []),
      JSON.stringify(c.unknowns || []),
      c.confidence || null,
      c.reasoning || null,
      i,
    ]);
  }

  await pool.query('UPDATE proposals SET status = $1 WHERE id = $2', ['voting', proposalId]);
  return getProposal(proposalId);
}

export async function getProposal(proposalId) {
  const pR = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposalId]);
  const p = pR.rows[0];
  if (!p) return null;
  const candidatesR = await pool.query(
    'SELECT * FROM proposal_candidates WHERE proposal_id = $1 ORDER BY sort_order',
    [proposalId]
  );
  const candidates = candidatesR.rows.map(c => ({
    ...c,
    thesis_bullets: JSON.parse(c.thesis_bullets || '[]'),
    risk_bullets: JSON.parse(c.risk_bullets || '[]'),
    unknowns: JSON.parse(c.unknowns || '[]'),
  }));
  return { ...p, candidates };
}

export async function listProposals(clubId, status = null) {
  let sql = `
    SELECT p.*, u.pseudonym AS requested_by_pseudonym
    FROM proposals p
    JOIN users u ON u.id = p.requested_by_user_id
    WHERE p.club_id = $1
  `;
  const params = [clubId];
  if (status) {
    sql += ' AND p.status = $2';
    params.push(status);
  }
  sql += ' ORDER BY p.created_at DESC';
  const r = await pool.query(sql, params);
  return r.rows;
}

export async function startVoting(proposalId, votingEndsAt) {
  await pool.query(
    "UPDATE proposals SET status = 'voting', voting_ends_at = $1 WHERE id = $2",
    [votingEndsAt, proposalId]
  );
  return getProposal(proposalId);
}

export async function castVote(candidateId, userId, vote, rationale) {
  const candidateR = await pool.query('SELECT * FROM proposal_candidates WHERE id = $1', [candidateId]);
  if (!candidateR.rows[0]) return null;
  const validVotes = ['buy', 'watch', 'pass'];
  if (!validVotes.includes(vote)) return null;
  try {
    await pool.query(`
      INSERT INTO votes (proposal_candidate_id, user_id, vote, rationale)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (proposal_candidate_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, rationale = EXCLUDED.rationale
    `, [candidateId, userId, vote, rationale || null]);
    const r = await pool.query(
      'SELECT * FROM votes WHERE proposal_candidate_id = $1 AND user_id = $2',
      [candidateId, userId]
    );
    return r.rows[0];
  } catch {
    return null;
  }
}

export async function getVotesForProposal(proposalId) {
  const r = await pool.query(`
    SELECT v.*, u.pseudonym, pc.ticker
    FROM votes v
    JOIN users u ON u.id = v.user_id
    JOIN proposal_candidates pc ON pc.id = v.proposal_candidate_id
    WHERE pc.proposal_id = $1
  `, [proposalId]);
  return r.rows;
}

export async function publishReceipt(proposalId, signedByUserId) {
  const proposal = await getProposal(proposalId);
  if (!proposal || proposal.status !== 'voting') return null;

  const votes = await getVotesForProposal(proposalId);
  const receiptPayload = {
    proposal_id: proposalId,
    thesis_summary: proposal.thesis_summary,
    data_as_of: proposal.data_as_of,
    candidates: proposal.candidates.map(c => ({
      ticker: c.ticker,
      thesis_bullets: c.thesis_bullets,
      risk_bullets: c.risk_bullets,
      unknowns: c.unknowns,
    })),
    votes: votes.map(v => ({ ticker: v.ticker, pseudonym: v.pseudonym, vote: v.vote })),
    signed_by: signedByUserId,
    published_at: new Date().toISOString(),
  };
  const content = JSON.stringify(receiptPayload);
  const contentHash = hashContent(content);

  const lastR = await pool.query('SELECT content_hash FROM decision_receipts ORDER BY id DESC LIMIT 1');
  const prevHash = lastR.rows[0] ? lastR.rows[0].content_hash : null;

  await pool.query(`
    INSERT INTO decision_receipts (proposal_id, content_hash, prev_receipt_hash, payload, signed_by_user_id)
    VALUES ($1, $2, $3, $4, $5)
  `, [proposalId, contentHash, prevHash, content, signedByUserId]);

  await pool.query(
    "UPDATE proposals SET status = 'published', finalized_at = NOW(), published_at = NOW() WHERE id = $1",
    [proposalId]
  );

  return { ...receiptPayload, content_hash: contentHash, prev_receipt_hash: prevHash };
}

export async function getReceipt(proposalId) {
  const r = await pool.query('SELECT * FROM decision_receipts WHERE proposal_id = $1', [proposalId]);
  const row = r.rows[0];
  if (!row) return null;
  const payload = row.payload ? JSON.parse(row.payload) : null;
  return { ...row, payload };
}
