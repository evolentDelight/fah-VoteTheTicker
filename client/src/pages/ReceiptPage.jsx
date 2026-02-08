import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function ReceiptPage({ authToken }) {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    api.get(`/proposals/${id}/receipt`, authToken).then(setReceipt).catch(() => setReceipt(null));
  }, [id, authToken]);

  if (!receipt) return <p className="text-slate-500">Loading receipt...</p>;

  const payload = receipt.payload || {};

  return (
    <div className="space-y-6 rounded-lg border border-cyan-600/30 bg-slate-900/50 p-4">
      <h2 className="text-lg font-bold text-cyan-400">Decision Receipt</h2>
      <p className="text-xs text-slate-500">Tamper-evident, hash-linked record</p>

      {payload.thesis_summary && (
        <div>
          <h4 className="text-xs text-slate-500">Summary</h4>
          <p className="text-sm text-slate-300">{payload.thesis_summary}</p>
        </div>
      )}

      {payload.votes && payload.votes.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500">Votes</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            {payload.votes.map((v, i) => (
              <li key={i}>{v.pseudonym || 'Member'}: {v.vote} ({v.ticker})</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="text-xs text-slate-500">Content Hash</h4>
        <p className="font-mono text-xs text-slate-300 break-all">{receipt.content_hash}</p>
      </div>

      {receipt.prev_receipt_hash && (
        <div>
          <h4 className="text-xs text-slate-500">Previous Receipt Hash</h4>
          <p className="font-mono text-xs text-slate-300 break-all">{receipt.prev_receipt_hash}</p>
        </div>
      )}

      <div>
        <h4 className="text-xs text-slate-500">Published At</h4>
        <p className="text-sm text-slate-300">{receipt.created_at}</p>
      </div>

      <p className="text-xs text-amber-500">
        This receipt is immutable. Votes and proposal content are recorded for audit. Not financial advice.
      </p>
    </div>
  );
}
