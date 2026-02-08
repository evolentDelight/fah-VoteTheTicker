import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CreateClub({ authToken }) {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!authToken) return alert('Open in Alien to authenticate.');
    if (!slug.trim() || !name.trim()) return alert('Slug and name required.');
    setLoading(true);
    api
      .post('/clubs', { slug: slug.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim(), description: description.trim() || null }, authToken)
      .then((c) => navigate(`/clubs/${c.slug}`))
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Create Club</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Name</label>
          <input
            type="text"
            placeholder="e.g. Tech Growth Club"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Slug (URL-friendly)</label>
          <input
            type="text"
            placeholder="e.g. tech-growth"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Description (optional)</label>
          <textarea
            placeholder="What's this club about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium"
        >
          {loading ? 'Creating...' : 'Create Club'}
        </button>
      </form>
    </div>
  );
}
