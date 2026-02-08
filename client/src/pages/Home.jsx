import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Home({ authToken }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/clubs').then(setClubs).catch(() => setClubs([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Discover clubs, join with a reason, vote on proposals, and get decision receipts.
      </p>

      <div className="flex gap-3">
        {authToken && (
          <Link
            to="/clubs/new"
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
          >
            Create Club
          </Link>
        )}
      </div>

      <section>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Public Clubs</h2>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : clubs.length === 0 ? (
          <div className="rounded-lg border border-slate-700 p-6 text-center text-slate-500">
            No clubs yet. {authToken ? 'Create one!' : 'Open in Alien and create a club.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {clubs.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/clubs/${c.slug}`}
                  className="block rounded-lg border border-slate-700 p-4 hover:border-cyan-600/50 transition"
                >
                  <div className="font-medium text-slate-100">{c.name}</div>
                  <div className="text-sm text-slate-500">
                    {c.member_count || 0} members · {c.owner_pseudonym || 'Owner'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
