import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ClubJoin({ authToken }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!authToken) return alert('Open in Alien to authenticate.');
    setLoading(true);
    api
      .post(`/clubs/${slug}/join`, { reason_for_interest: reason.trim() }, authToken)
      .then(() => navigate(`/clubs/${slug}`))
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Request to Join</h2>
      <p className="text-slate-400 text-sm">
        Tell the club why you want to join. Admins will review your request.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Reason for interest..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
