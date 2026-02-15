import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stats } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Leaderboard() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await stats.leaderboard(limit, page * limit);
        setArtists(res.data.artists);
        setTotal(res.data.total);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [page]);

  const getPositionLabel = (avgPosition) => {
    if (avgPosition <= 0.5) return 'USUALLY OPENER';
    if (avgPosition <= 1.5) return 'USUALLY EARLY';
    if (avgPosition <= 2.5) return 'USUALLY MIDDLE';
    if (avgPosition <= 3.5) return 'USUALLY LATE';
    return 'USUALLY HEADLINER';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 uppercase tracking-tight">
            ARTIST LEADERBOARD
          </h1>
          <p className="text-gray-500 text-lg uppercase">
            The most popular artists across all Backyard Marquee lineups
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-white text-xl uppercase">LOADING...</p>
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-xl mb-4 uppercase">No artists on the leaderboard yet</p>
            <Link
              to="/create"
              className="inline-block bg-white text-black px-8 py-3 font-bold uppercase hover:bg-gray-200 transition"
            >
              CREATE THE FIRST LINEUP
            </Link>
          </div>
        ) : (
          <>
            <div className="max-w-4xl mx-auto">
              {artists.map((artist, index) => {
                const rank = page * limit + index + 1;

                return (
                  <Link
                    key={artist.artist_name}
                    to={`/artist/${encodeURIComponent(artist.artist_name)}`}
                    className="group block border-b-2 border-white/20 hover:border-white transition"
                  >
                    <div className="flex items-center gap-4 py-4">
                      <div className={`w-16 h-16 flex items-center justify-center font-bold text-2xl border-2 ${
                        rank <= 3 ? 'border-white bg-white text-black' : 'border-white/50 text-white'
                      }`}>
                        {String(rank).padStart(2, '0')}
                      </div>

                      {artist.artist_image ? (
                        <img
                          src={artist.artist_image}
                          alt={artist.artist_name}
                          className="w-16 h-16 object-cover border border-white/50"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/10 border border-white/50 flex items-center justify-center text-gray-500 font-bold">
                          ?
                        </div>
                      )}

                      <div className="flex-1">
                        <h3 className="text-xl font-bold uppercase group-hover:text-gray-300 transition">
                          {artist.artist_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 uppercase">
                          <span>{artist.lineup_count} LINEUP{artist.lineup_count !== 1 ? 'S' : ''}</span>
                          <span>/</span>
                          <span>{artist.headliner_count}X HEADLINER</span>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-gray-500 uppercase border border-white/30 px-3 py-1">
                        {getPositionLabel(artist.avg_position)}
                      </div>

                      <div className="text-gray-500 group-hover:text-white transition font-bold">
                        &rarr;
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-6 py-2 border-2 border-white hover:bg-white hover:text-black transition disabled:opacity-30 disabled:cursor-not-allowed uppercase font-bold"
              >
                PREV
              </button>
              <span className="px-4 py-2 text-gray-500 uppercase">
                PAGE {page + 1} OF {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-6 py-2 border-2 border-white hover:bg-white hover:text-black transition disabled:opacity-30 disabled:cursor-not-allowed uppercase font-bold"
              >
                NEXT
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
