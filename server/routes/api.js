import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { findOrCreateUser, updatePseudonym } from '../services/userService.js';
import * as club from '../services/clubService.js';
import * as watchlist from '../services/watchlistService.js';
import * as proposalService from '../services/proposalService.js';
import * as agent from '../services/agentService.js';
import * as discussion from '../services/discussionService.js';

const router = Router();

async function withUser(req, res, next) {
  if (!req.alienId) return next();
  try {
    req.user = await findOrCreateUser(req.alienId);
    next();
  } catch (e) {
    next(e);
  }
}

// --- Public routes ---
router.get('/clubs', async (req, res, next) => {
  try {
    const list = await club.listPublicClubs();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/clubs/:slug', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    res.json(c);
  } catch (e) {
    next(e);
  }
});

// --- Auth required ---
router.use(authMiddleware, withUser);

router.get('/me', (req, res) => res.json(req.user));

router.patch('/me', async (req, res, next) => {
  try {
    const { pseudonym } = req.body || {};
    const updated = await updatePseudonym(req.user.id, pseudonym);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// --- Clubs ---
router.post('/clubs', async (req, res, next) => {
  try {
    const { slug, name, description } = req.body || {};
    if (!slug || !name) return res.status(400).json({ error: 'slug and name required' });
    const slugNorm = String(slug).toLowerCase().replace(/\s+/g, '-');
    const c = await club.createClub({
      slug: slugNorm,
      name: String(name),
      description: description ? String(description) : null,
      ownerUserId: req.user.id,
    });
    res.status(201).json(c);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Club slug already exists' });
    next(e);
  }
});

router.get('/clubs/:slug/member', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    res.json({ club: c, member: m });
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/join', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const { reason_for_interest } = req.body || {};
    const result = await club.requestJoin(c.id, req.user.id, reason_for_interest);
    if (!result.ok) return res.status(409).json({ error: result.error || 'Already applied' });
    res.status(201).json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get('/clubs/:slug/members', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const members = await club.getMembersWithApproved(c.id);
    res.json(members);
  } catch (e) {
    next(e);
  }
});

router.get('/clubs/:slug/pending', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (!club.isRoleAllowed(m.role, 'approve_members')) return res.status(403).json({ error: 'Insufficient role' });
    const pending = await club.getPendingJoinRequests(c.id);
    res.json(pending);
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/approve/:memberId', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (!club.isRoleAllowed(m.role, 'approve_members')) return res.status(403).json({ error: 'Insufficient role' });
    const updated = await club.approveMember(c.id, parseInt(req.params.memberId, 10));
    if (!updated) return res.status(404).json({ error: 'Member not found' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/reject/:memberId', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (!club.isRoleAllowed(m.role, 'approve_members')) return res.status(403).json({ error: 'Insufficient role' });
    const updated = await club.rejectMember(c.id, parseInt(req.params.memberId, 10));
    if (!updated) return res.status(404).json({ error: 'Member not found' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// --- Watchlist ---
router.get('/clubs/:slug/watchlist', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const list = await watchlist.getWatchlist(c.id);
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/watchlist', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const { ticker } = req.body || {};
    const added = await watchlist.addToWatchlist(c.id, ticker, req.user.id);
    if (!added) return res.status(409).json({ error: 'Already on watchlist or invalid ticker' });
    res.status(201).json(added);
  } catch (e) {
    next(e);
  }
});

router.delete('/clubs/:slug/watchlist/:ticker', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    await watchlist.removeFromWatchlist(c.id, req.params.ticker);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// --- Agent proposals ---
router.post('/clubs/:slug/proposals/generate', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const { candidates, thesisSummary } = await agent.generateProposalCandidates(c.id);
    const created = await proposalService.createProposal(c.id, req.user.id, candidates, thesisSummary);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// --- Proposals ---
router.get('/clubs/:slug/proposals', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const list = await proposalService.listProposals(c.id);
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/proposals/:id', async (req, res, next) => {
  try {
    const p = await proposalService.getProposal(parseInt(req.params.id, 10));
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const m = await club.getMember(p.club_id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    res.json(p);
  } catch (e) {
    next(e);
  }
});

router.post('/proposals/:id/vote', async (req, res, next) => {
  try {
    const { candidate_id, vote, rationale } = req.body || {};
    if (!candidate_id || !vote) return res.status(400).json({ error: 'candidate_id and vote required' });
    const p = await proposalService.getProposal(parseInt(req.params.id, 10));
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const m = await club.getMember(p.club_id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (p.status !== 'voting') return res.status(400).json({ error: 'Proposal not in voting' });
    const v = await proposalService.castVote(parseInt(candidate_id, 10), req.user.id, vote, rationale);
    if (!v) return res.status(400).json({ error: 'Invalid vote' });
    res.json(v);
  } catch (e) {
    next(e);
  }
});

router.post('/proposals/:id/publish', async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id, 10);
    const p = await proposalService.getProposal(proposalId);
    if (!p) return res.status(404).json({ error: 'Proposal not found' });
    const m = await club.getMember(p.club_id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (!club.isRoleAllowed(m.role, 'publish_receipts')) return res.status(403).json({ error: 'Insufficient role' });
    const receipt = await proposalService.publishReceipt(proposalId, req.user.id);
    if (!receipt) return res.status(400).json({ error: 'Cannot publish' });
    res.json(receipt);
  } catch (e) {
    next(e);
  }
});

router.get('/proposals/:id/receipt', async (req, res, next) => {
  try {
    const r = await proposalService.getReceipt(parseInt(req.params.id, 10));
    if (!r) return res.status(404).json({ error: 'Receipt not found' });
    res.json(r);
  } catch (e) {
    next(e);
  }
});

// --- Discussion ---
router.get('/clubs/:slug/discussion', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const { proposal_id } = req.query;
    const messages = await discussion.getMessages(c.id, proposal_id ? parseInt(proposal_id, 10) : null);
    res.json(messages);
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/discussion', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    const { body, proposal_id } = req.body || {};
    if (!body || typeof body !== 'string') return res.status(400).json({ error: 'body required' });
    const msg = await discussion.postMessage(c.id, req.user.id, body.trim(), proposal_id ? parseInt(proposal_id, 10) : null);
    res.status(201).json(msg);
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/discussion/:messageId/pin', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const m = await club.getMember(c.id, req.user.id);
    if (!m || m.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (!club.isRoleAllowed(m.role, 'pin_posts')) return res.status(403).json({ error: 'Insufficient role' });
    const msg = await discussion.pinMessage(parseInt(req.params.messageId, 10), c.id, req.user.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch (e) {
    next(e);
  }
});

router.post('/clubs/:slug/discussion/:messageId/unpin', async (req, res, next) => {
  try {
    const c = await club.getClubBySlug(req.params.slug);
    if (!c) return res.status(404).json({ error: 'Club not found' });
    const member = await club.getMember(c.id, req.user.id);
    if (!member || member.status !== 'approved') return res.status(403).json({ error: 'Members only' });
    if (!club.isRoleAllowed(member.role, 'pin_posts')) return res.status(403).json({ error: 'Insufficient role' });
    const msg = await discussion.unpinMessage(parseInt(req.params.messageId, 10), c.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch (e) {
    next(e);
  }
});

export default router;
