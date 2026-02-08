import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const VOTE_OPTIONS = [
  { value: 'buy', label: 'Buy', color: 'emerald' },
  { value: 'watch', label: 'Watch', color: 'amber' },
  { value: 'pass', label: 'Pass', color: 'slate' },
];

export default function ProposalPage({ authToken }) {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    api.get(`/proposals/${id}`, authToken).then(setProposal).catch(() => setProposal(null)).finally(() => setLoading(false));
  }, [id, authToken]);

  const handleVote = (candidateId, vote) => {
    api.post(`/proposals/${id}/vote`, { candidate_id: candidateId, vote }, authToken)
      .then(() => {
        setVotes((prev) => ({ ...prev, [candidateId]: vote }));
        return api.get(`/proposals/${id}`, authToken);
      })
      .then(setProposal)
      .catch(alert);
  };

  const handlePublish = () => {
    api.post(`/proposals/${id}/publish`, {}, authToken)
      .then(() => (window.location.href = `/proposals/${id}/receipt`))
      .catch(alert);
  };

  if (!proposal) return <p className="text-slate-500">{loading ? 'Loading...' : 'Proposal not found.'}</p>;

  const isVoting = proposal.status === 'voting';
  const isPublished = proposal.status === 'published';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 p-4">
        <p className="text-xs text-slate-500 mb-1">Data as of: {proposal.data_as_of || 'N/A'}</p>
        <p className="text-sm text-slate-300">{proposal.thesis_summary}</p>
        <p className="text-xs text-amber-500 mt-2">Not financial advice. Educational only.</p>
      </div>

      <ul className="space-y-4">
        {proposal.candidates?.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-700 p-4 space-y-3">
            <div className="font-mono font-bold text-cyan-400">{c.ticker}</div>
            <div>
              <h4 className="text-xs text-slate-500">Thesis</h4>
              <ul className="list-disc list-inside text-sm text-slate-300">
                {c.thesis_bullets?.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-amber-500">Risks</h4>
              <ul className="list-disc list-inside text-sm text-slate-300">
                {c.risk_bullets?.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-slate-500">Unknowns</h4>
              <ul className="list-disc list-inside text-sm text-slate-300">
                {c.unknowns?.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
            {c.confidence && <p className="text-xs text-slate-500">Confidence: {c.confidence}</p>}
            {isVoting && authToken && (
              <div className="flex gap-2 pt-2">
                {VOTE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => handleVote(c.id, o.value)}
                    className={`px-3 py-1.5 rounded text-sm font-medium border ${
                      votes[c.id] === o.value || c.myVote === o.value
                        ? `bg-${o.color}-600 border-${o.color}-500 text-white`
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                    style={votes[c.id] === o.value || c.myVote === o.value ? { backgroundColor: o.color === 'emerald' ? '#059669' : o.color === 'amber' ? '#d97706' : '#475569' } : {}}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {isVoting && authToken && (
        <button
          onClick={handlePublish}
          className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        >
          Publish Decision Receipt
        </button>
      )}

      {isPublished && (
        <Link
          to={`/proposals/${id}/receipt`}
          className="block w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-center"
        >
          View Decision Receipt
        </Link>
      )}
    </div>
  );
}
