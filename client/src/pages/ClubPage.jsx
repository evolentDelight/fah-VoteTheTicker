import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ClubPage({ authToken }) {
  const { slug } = useParams();
  const [club, setClub] = useState(null);
  const [member, setMember] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [discussion, setDiscussion] = useState([]);
  const [tab, setTab] = useState('overview');
  const [newTicker, setNewTicker] = useState('');
  const [loading, setLoading] = useState(true);

  const loadClub = () => {
    api.get(`/clubs/${slug}`).then(setClub).catch(() => setClub(null));
  };

  useEffect(() => {
    loadClub();
  }, [slug]);

  useEffect(() => {
    if (!club || !authToken) {
      setLoading(false);
      return;
    }
    api.get(`/clubs/${slug}/member`, authToken)
      .then(({ member: m }) => setMember(m))
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [club, slug, authToken]);

  useEffect(() => {
    if (!club || !authToken || !member || member.status !== 'approved') return;
    api.get(`/clubs/${slug}/watchlist`, authToken).then(setWatchlist).catch(() => setWatchlist([]));
    api.get(`/clubs/${slug}/proposals`, authToken).then(setProposals).catch(() => setProposals([]));
    api.get(`/clubs/${slug}/discussion`, authToken).then(setDiscussion).catch(() => setDiscussion([]));
  }, [club, slug, authToken, member]);

  const handleJoin = () => {
    window.location.href = `/clubs/${slug}/join`;
  };

  const handleAddTicker = (e) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    api.post(`/clubs/${slug}/watchlist`, { ticker: newTicker.trim().toUpperCase() }, authToken)
      .then(() => {
        setNewTicker('');
        return api.get(`/clubs/${slug}/watchlist`, authToken);
      })
      .then(setWatchlist)
      .catch(alert);
  };

  const handleGenerateProposal = () => {
    api.post(`/clubs/${slug}/proposals/generate`, {}, authToken)
      .then((p) => (window.location.href = `/proposals/${p.id}`))
      .catch(alert);
  };

  if (!club) return <p className="text-slate-500">Loading...</p>;

  const isMember = member?.status === 'approved';
  const isPending = member?.status === 'pending';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-100">{club.name}</h2>
        <p className="text-slate-500 text-sm">{club.description || 'No description.'}</p>
      </div>

      {!authToken && (
        <p className="text-amber-400 text-sm">Sign in via Alien to join and participate.</p>
      )}

      {authToken && !member && (
        <button
          onClick={handleJoin}
          className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Request to Join
        </button>
      )}

      {authToken && isPending && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-4 text-amber-200 text-sm">
          Your join request is pending review.
        </div>
      )}

      {authToken && isMember && (
        <>
          <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
            {['overview', 'watchlist', 'proposals', 'discussion', ...(member?.role === 'owner' || member?.role === 'moderator' ? ['admin'] : [])].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${tab === t ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <button
                onClick={handleGenerateProposal}
                className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Generate Proposal (Agent)
              </button>
              <p className="text-xs text-slate-500">
                Agent proposes 3 candidates from the watchlist with thesis, risks, unknowns. Educational only. Not financial advice.
              </p>
            </div>
          )}

          {tab === 'watchlist' && (
            <div className="space-y-4">
              <form onSubmit={handleAddTicker} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ticker (e.g. AAPL)"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white">
                  Add
                </button>
              </form>
              <ul className="space-y-2">
                {watchlist.map((w) => (
                  <li key={w.id} className="flex justify-between items-center rounded-lg border border-slate-700 px-3 py-2">
                    <span className="font-mono font-medium">{w.ticker}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'admin' && member && (member.role === 'owner' || member.role === 'moderator') && (
            <AdminTab slug={slug} authToken={authToken} />
          )}

          {tab === 'proposals' && (
            <ul className="space-y-2">
              {proposals.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/proposals/${p.id}`}
                    className="block rounded-lg border border-slate-700 p-4 hover:border-cyan-600/50"
                  >
                    <span className="text-slate-400 text-sm">{p.status}</span>
                    <div className="font-medium">{p.thesis_summary?.slice(0, 80)}…</div>
                  </Link>
                </li>
              ))}
              {proposals.length === 0 && <p className="text-slate-500 text-sm">No proposals yet.</p>}
            </ul>
          )}

          {tab === 'discussion' && (
            <DiscussionTab slug={slug} messages={discussion} authToken={authToken} member={member} onRefresh={() => api.get(`/clubs/${slug}/discussion`, authToken).then(setDiscussion)} />
          )}
        </>
      )}
    </div>
  );
}

function AdminTab({ slug, authToken, onRefresh }) {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    api.get(`/clubs/${slug}/pending`, authToken).then(setPending).catch(() => setPending([]));
  }, [slug, authToken]);

  const refreshPending = () => api.get(`/clubs/${slug}/pending`, authToken).then(setPending);

  const handleApprove = (memberId) => {
    api.post(`/clubs/${slug}/approve/${memberId}`, {}, authToken).then(refreshPending).catch(alert);
  };
  const handleReject = (memberId) => {
    api.post(`/clubs/${slug}/reject/${memberId}`, {}, authToken).then(refreshPending).catch(alert);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-400">Pending Join Requests</h3>
      {pending.length === 0 ? (
        <p className="text-slate-500 text-sm">No pending requests.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((m) => (
            <li key={m.id} className="rounded-lg border border-slate-700 p-3">
              <span className="text-slate-200">{m.pseudonym || 'Anonymous'}</span>
              {m.reason_for_interest && <p className="text-sm text-slate-500 mt-1">{m.reason_for_interest}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleApprove(m.id)} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">Approve</button>
                <button onClick={() => handleReject(m.id)} className="px-3 py-1 rounded bg-slate-600 text-slate-300 text-sm">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DiscussionTab({ slug, messages, authToken, member, onRefresh }) {
  const [body, setBody] = useState('');

  const canPin = member?.role === 'owner' || member?.role === 'moderator';

  const handlePost = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    api.post(`/clubs/${slug}/discussion`, { body: body.trim() }, authToken)
      .then(() => {
        setBody('');
        onRefresh();
      })
      .catch(alert);
  };

  const handlePin = (msgId) => {
    api.post(`/clubs/${slug}/discussion/${msgId}/pin`, {}, authToken).then(onRefresh).catch(alert);
  };

  const pinned = messages.filter((m) => m.is_pinned);
  const rest = messages.filter((m) => !m.is_pinned);

  return (
    <div className="space-y-4">
      <form onSubmit={handlePost} className="flex gap-2">
        <input
          type="text"
          placeholder="Add a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white">
          Post
        </button>
      </form>

      <div className="space-y-2">
        {pinned.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-cyan-400 mb-2">Pinned</h4>
            <ul className="space-y-2">
              {pinned.map((m) => (
                <li key={m.id} className="rounded-lg border border-cyan-600/30 bg-cyan-900/20 p-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-cyan-400">{m.pseudonym || 'Member'}</span>
                    {canPin && (
                      <button onClick={() => api.post(`/clubs/${slug}/discussion/${m.id}/unpin`, {}, authToken).then(onRefresh)} className="text-xs text-slate-500">Unpin</button>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 mt-1">{m.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h4 className="text-xs font-medium text-slate-500">Messages</h4>
        <ul className="space-y-2">
          {rest.map((m) => (
            <li key={m.id} className="rounded-lg border border-slate-700 p-3">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-500">{m.pseudonym || 'Member'}</span>
                {canPin && (
                  <button onClick={() => handlePin(m.id)} className="text-xs text-slate-500">Pin</button>
                )}
              </div>
              <p className="text-sm text-slate-200 mt-1">{m.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
