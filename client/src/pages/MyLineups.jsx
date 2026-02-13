import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lineups as lineupsApi } from '../api/client';
import Navbar from '../components/Navbar';

export default function MyLineups() {
  const [myLineups, setMyLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchLineups = async () => {
      if (!user) return;
      try {
        const res = await lineupsApi.getAll();
        if (res.data.length === 0) {
          navigate('/create', { replace: true });
          return;
        }
        setMyLineups(res.data);
      } catch {
        setMyLineups([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLineups();
  }, [user, navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lineup? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await lineupsApi.delete(id);
      setMyLineups((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert('Failed to delete lineup');
    } finally {
      setDeleting(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl uppercase">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold uppercase tracking-tight">MY LINEUPS</h1>
          <Link
            to="/create"
            className="bg-white text-black px-6 py-3 font-bold uppercase hover:bg-gray-200 transition"
          >
            CREATE NEW LINEUP
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myLineups.map((lineup) => (
            <div key={lineup.id} className="border-2 border-white/50 hover:border-white transition">
              <Link to={`/lineup/${lineup.id}`} className="block p-6">
                <h3 className="text-xl font-bold mb-2 uppercase hover:text-gray-300 transition">
                  {lineup.title}
                </h3>
                {lineup.description && (
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    &ldquo;{lineup.description}&rdquo;
                  </p>
                )}
                <p className="text-gray-600 text-sm mb-4 uppercase">
                  {new Date(lineup.created_at).toLocaleDateString()}
                </p>

                <div className="space-y-1">
                  {lineup.artists.map((artist, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className={`w-6 font-bold text-sm ${
                        index === 0 ? 'text-white' :
                        index === 1 ? 'text-gray-300' :
                        'text-gray-500'
                      }`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`flex-1 uppercase ${index < 2 ? 'font-bold' : 'text-gray-500'}`}>
                        {artist.artist_name}
                      </span>
                    </div>
                  ))}
                </div>

                {lineup.tags && lineup.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {lineup.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white/10 text-gray-500 text-xs uppercase">{tag}</span>
                    ))}
                  </div>
                )}
              </Link>

              <div className="flex border-t border-white/30">
                <Link
                  to={`/edit/${lineup.id}`}
                  className="flex-1 text-center py-3 text-sm font-bold uppercase text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  EDIT
                </Link>
                <button
                  onClick={() => handleDelete(lineup.id)}
                  disabled={deleting === lineup.id}
                  className="flex-1 text-center py-3 text-sm font-bold uppercase text-gray-400 hover:text-white hover:bg-white/10 transition border-l border-white/30 disabled:opacity-50"
                >
                  {deleting === lineup.id ? 'DELETING...' : 'DELETE'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
