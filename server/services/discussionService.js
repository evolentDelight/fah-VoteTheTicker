import pool from '../db.js';

export async function getMessages(clubId, proposalId = null) {
  let sql = `
    SELECT dm.*, u.pseudonym
    FROM discussion_messages dm
    JOIN users u ON u.id = dm.user_id
    WHERE dm.club_id = $1
  `;
  const params = [clubId];
  if (proposalId) {
    sql += ' AND (dm.proposal_id = $2 OR dm.proposal_id IS NULL)';
    params.push(proposalId);
  }
  sql += ' ORDER BY dm.is_pinned DESC, dm.created_at ASC';
  const r = await pool.query(sql, params);
  return r.rows;
}

export async function postMessage(clubId, userId, body, proposalId = null) {
  const result = await pool.query(`
    INSERT INTO discussion_messages (club_id, proposal_id, user_id, body) VALUES ($1, $2, $3, $4) RETURNING id
  `, [clubId, proposalId, userId, body]);
  const id = result.rows[0].id;
  const r = await pool.query(
    'SELECT dm.*, u.pseudonym FROM discussion_messages dm JOIN users u ON u.id = dm.user_id WHERE dm.id = $1',
    [id]
  );
  return r.rows[0];
}

export async function pinMessage(messageId, clubId, userId) {
  const msgR = await pool.query('SELECT * FROM discussion_messages WHERE id = $1 AND club_id = $2', [messageId, clubId]);
  if (!msgR.rows[0]) return null;
  await pool.query(
    'UPDATE discussion_messages SET is_pinned = 1, pinned_at = NOW(), pinned_by_user_id = $1 WHERE id = $2',
    [userId, messageId]
  );
  const r = await pool.query(
    'SELECT dm.*, u.pseudonym FROM discussion_messages dm JOIN users u ON u.id = dm.user_id WHERE dm.id = $1',
    [messageId]
  );
  return r.rows[0];
}

export async function unpinMessage(messageId, clubId) {
  const msgR = await pool.query('SELECT * FROM discussion_messages WHERE id = $1 AND club_id = $2', [messageId, clubId]);
  if (!msgR.rows[0]) return null;
  await pool.query(
    'UPDATE discussion_messages SET is_pinned = 0, pinned_at = NULL, pinned_by_user_id = NULL WHERE id = $1',
    [messageId]
  );
  const r = await pool.query(
    'SELECT dm.*, u.pseudonym FROM discussion_messages dm JOIN users u ON u.id = dm.user_id WHERE dm.id = $1',
    [messageId]
  );
  return r.rows[0];
}
