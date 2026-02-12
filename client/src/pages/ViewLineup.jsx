import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lineups } from '../api/client';
import Navbar from '../components/Navbar';

export default function ViewLineup() {
  const { id } = useParams();
  const [lineup, setLineup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchLineup = async () => {
      try {
        const res = await lineups.getOne(id);
        setLineup(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load lineup');
      } finally {
        setLoading(false);
      }
    };
    fetchLineup();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copy this link: ' + url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl uppercase tracking-wide">LOADING...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-white text-xl mb-4 uppercase">{error}</p>
          <Link to="/" className="text-gray-500 hover:text-white uppercase border-b border-gray-500 hover:border-white">
            GO HOME
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Festival Poster - Brutalist Style */}
          <div className="border-4 border-white">
            {/* Header */}
            <div className="border-b-4 border-white p-6 text-center">
              <p className="text-gray-500 uppercase tracking-[0.3em] text-xs font-bold mb-4">
                BACKYARD MARQUEE PRESENTS
              </p>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">
                {lineup.title}
              </h1>
            </div>

            {lineup.description && (
              <div className="border-b-2 border-white p-4">
                <p className="text-gray-400 text-sm text-center">
                  "{lineup.description}"
                </p>
              </div>
            )}

            {/* Lineup */}
            <div className="p-6">
              {lineup.artists.map((artist, index) => (
                <div
                  key={index}
                  className={`py-4 ${index < lineup.artists.length - 1 ? 'border-b border-white/30' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-bold w-8">{String(index + 1).padStart(2, '0')}</span>
                    {artist.artist_image && (
                      <img
                        src={artist.artist_image}
                        alt={artist.artist_name}
                        className={`object-cover border border-white ${
                          index === 0 ? 'w-16 h-16' : 'w-12 h-12'
                        }`}
                      />
                    )}
                    <span className={`font-bold uppercase tracking-wide ${
                      index === 0
                        ? 'text-3xl md:text-4xl'
                        : index === 1
                        ? 'text-2xl md:text-3xl text-gray-200'
                        : index === 2
                        ? 'text-xl md:text-2xl text-gray-300'
                        : 'text-lg md:text-xl text-gray-400'
                    }`}>
                      {artist.artist_name}
                    </span>
                  </div>
                  {artist.note && (
                    <p className="text-gray-500 text-sm mt-2 ml-12 italic">
                      "{artist.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t-4 border-white p-4">
              <p className="text-gray-600 text-xs uppercase tracking-widest text-center">
                backyard-marquee.vercel.app
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-4 items-center mt-8">
            <button
              onClick={handleShare}
              className="bg-white text-black px-8 py-3 font-bold uppercase hover:bg-gray-200 transition"
            >
              {copied ? 'LINK COPIED' : 'SHARE THIS LINEUP'}
            </button>

            <div className="text-center mt-4">
              <p className="text-gray-500 uppercase tracking-widest text-sm mb-3">
                THINK YOU COULD DO BETTER?
              </p>
              <Link
                to="/create"
                className="border-2 border-white px-8 py-3 font-bold uppercase hover:bg-white hover:text-black transition inline-block"
              >
                CREATE YOUR OWN
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-600 mt-6 text-sm uppercase">
            CREATED {new Date(lineup.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
