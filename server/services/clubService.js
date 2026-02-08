import pool from '../db.js';

export async function listPublicClubs() {
  const r = await pool.query(`
    SELECT c.*, u.pseudonym AS owner_pseudonym,
           (SELECT COUNT(*)::int FROM club_members cm WHERE cm.club_id = c.id AND cm.status = 'approved') AS member_count
    FROM clubs c
    JOIN users u ON u.id = c.owner_user_id
    WHERE c.is_public = 1
    ORDER BY c.created_at DESC
  `);
  return r.rows;
}

export async function getClubBySlug(slug) {
  const r = await pool.query(`
    SELECT c.*, u.pseudonym AS owner_pseudonym
    FROM clubs c
    JOIN users u ON u.id = c.owner_user_id
    WHERE c.slug = $1
  `, [slug]);
  return r.rows[0] || null;
}

export async function getClubById(id) {
  const r = await pool.query('SELECT * FROM clubs WHERE id = $1', [id]);
  return r.rows[0];
}

export async function createClub({ slug, name, description, ownerUserId }) {
  const client = await pool.connect();
  try {
    const clubResult = await client.query(`
      INSERT INTO clubs (slug, name, description, owner_user_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [slug, name, description, ownerUserId]);
    const club = clubResult.rows[0];
    await client.query(`
      INSERT INTO club_members (club_id, user_id, role, status)
      VALUES ($1, $2, 'owner', 'approved')
    `, [club.id, ownerUserId]);
    return club;
  } finally {
    client.release();
  }
}

export async function getMember(clubId, userId) {
  const r = await pool.query(
    'SELECT * FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId]
  );
  return r.rows[0];
}

export async function getMembersWithApproved(clubId) {
  const r = await pool.query(`
    SELECT cm.*, u.pseudonym
    FROM club_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.club_id = $1 AND cm.status = 'approved'
  `, [clubId]);
  return r.rows;
}

export async function getPendingJoinRequests(clubId) {
  const r = await pool.query(`
    SELECT cm.*, u.pseudonym
    FROM club_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.club_id = $1 AND cm.status = 'pending'
    ORDER BY cm.created_at ASC
  `, [clubId]);
  return r.rows;
}

export async function requestJoin(clubId, userId, reasonForInterest) {
  try {
    await pool.query(`
      INSERT INTO club_members (club_id, user_id, role, status, reason_for_interest)
      VALUES ($1, $2, 'member', 'pending', $3)
    `, [clubId, userId, reasonForInterest]);
    return { ok: true };
  } catch (e) {
    if (e.code === '23505') return { ok: false, error: 'Already applied or member' };
    throw e;
  }
}

export async function approveMember(clubId, memberId) {
  const memberR = await pool.query('SELECT * FROM club_members WHERE id = $1 AND club_id = $2', [memberId, clubId]);
  const member = memberR.rows[0];
  if (!member || member.status !== 'pending') return null;
  await pool.query(
    'UPDATE club_members SET status = $1, reviewed_at = NOW() WHERE id = $2',
    ['approved', memberId]
  );
  const r = await pool.query('SELECT * FROM club_members WHERE id = $1', [memberId]);
  return r.rows[0];
}

export async function rejectMember(clubId, memberId) {
  const memberR = await pool.query('SELECT * FROM club_members WHERE id = $1 AND club_id = $2', [memberId, clubId]);
  const member = memberR.rows[0];
  if (!member || member.status !== 'pending') return null;
  await pool.query(
    'UPDATE club_members SET status = $1, reviewed_at = NOW() WHERE id = $2',
    ['rejected', memberId]
  );
  const r = await pool.query('SELECT * FROM club_members WHERE id = $1', [memberId]);
  return r.rows[0];
}

export function isRoleAllowed(role, action) {
  const matrix = {
    owner: ['approve_members', 'pin_posts', 'publish_receipts', 'moderate', 'manage_club', 'add_risk_officer'],
    moderator: ['approve_members', 'pin_posts', 'moderate'],
    risk_officer: ['publish_receipts', 'co_sign'],
    member: ['vote', 'post', 'view'],
  };
  return (matrix[role] || []).includes(action);
}
