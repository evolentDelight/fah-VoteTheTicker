import pool from '../db.js';

export async function findOrCreateUser(alienId, pseudonym = null) {
  const existing = await pool.query('SELECT * FROM users WHERE alien_id = $1', [alienId]);
  if (existing.rows[0]) return existing.rows[0];
  const result = await pool.query(
    'INSERT INTO users (alien_id, pseudonym) VALUES ($1, $2) RETURNING *',
    [alienId, pseudonym]
  );
  return result.rows[0];
}

export async function updatePseudonym(userId, pseudonym) {
  await pool.query(
    'UPDATE users SET pseudonym = $1, updated_at = NOW() WHERE id = $2',
    [pseudonym || null, userId]
  );
  const r = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return r.rows[0];
}
