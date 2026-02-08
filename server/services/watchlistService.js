import pool from '../db.js';

export async function getWatchlist(clubId) {
  const r = await pool.query(`
    SELECT w.*, u.pseudonym AS added_by_pseudonym
    FROM watchlist w
    LEFT JOIN users u ON u.id = w.added_by_user_id
    WHERE w.club_id = $1
    ORDER BY w.created_at ASC
  `, [clubId]);
  return r.rows;
}

export async function addToWatchlist(clubId, ticker, userId) {
  const tickerNorm = String(ticker).trim().toUpperCase();
  if (!tickerNorm) return null;
  try {
    const r = await pool.query(`
      INSERT INTO watchlist (club_id, ticker, added_by_user_id) VALUES ($1, $2, $3) RETURNING *
    `, [clubId, tickerNorm, userId]);
    return r.rows[0];
  } catch (e) {
    if (e.code === '23505') return null;
    throw e;
  }
}

export async function removeFromWatchlist(clubId, ticker) {
  const tickerNorm = String(ticker).trim().toUpperCase();
  const r = await pool.query('DELETE FROM watchlist WHERE club_id = $1 AND ticker = $2', [clubId, tickerNorm]);
  return r.rowCount > 0;
}
