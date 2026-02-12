import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stats } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Discover() {
  const [lineups, setLineups] = useState([]);
  const [siteStats, setSiteStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 12;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lineupsRes, statsRes] = await Promise.all([
          stats.browse(limit, page * limit),
          stats.site()
        ]);
        setLineups(lineupsRes.data.lineups);
        setTotal(lineupsRes.data.total);
        setSiteStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await stats.searchArtists(searchQuery);
        setSearchResults(res.data.artists);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 uppercase tracking-tight">
            DISCOVER LINEUPS
          </h1>
          <p className="text-gray-500 text-lg mb-8 uppercase">
            Explore what others are dreaming up for their backyard concerts
          </p>

          {/* Site Stats */}
          {siteStats && (
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center border-2 border-white px-6 py-4">
                <p className="text-3xl font-bold">{siteStats.total_lineups}</p>
                <p className="text-gray-500 text-sm uppercase">LINEUPS</p>
              </div>
              <div className="text-center border-2 border-white px-6 py-4">
                <p className="text-3xl font-bold">{siteStats.unique_artists}</p>
                <p className="text-gray-500 text-sm uppercase">ARTISTS</p>
              </div>
              <div className="text-center border-2 border-white px-6 py-4">
                <p className="text-3xl font-bold">{siteStats.total_users}</p>
                <p className="text-gray-500 text-sm uppercase">USERS</p>
              </div>
            </div>
          )}

          {/* Artist Search */}
          <div className="max-w-md mx-auto relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH FOR AN ARTIST..."
              className="w-full px-6 py-4 bg-black border-2 border-white text-white placeholder-gray-500 focus:outline-none uppercase"
            />
            {searching && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500">
                ...
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-0 bg-black border-2 border-t-0 border-white max-h-64 overflow-y-auto z-10">
                {searchResults.map(artist => (
                  <Link
                    key={artist.artist_name}
                    to={`/artist/${encodeURIComponent(artist.artist_name)}`}
                    onClick={() => setSearchQuery('')}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white hover:text-black transition uppercase"
                  >
                    <span>{artist.artist_name}</span>
                    <span className="text-sm">
                      {artist.lineup_count} LINEUP{artist.lineup_count !== 1 ? 'S' : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lineups Grid */}
        <h2 className="text-2xl font-bold mb-6 uppercase tracking-wide">RECENT LINEUPS</h2>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-white text-xl uppercase">LOADING...</p>
          </div>
        ) : lineups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-xl mb-4 uppercase">No public lineups yet</p>
            <Link
              to="/create"
              className="inline-block bg-white text-black px-8 py-3 font-bold uppercase hover:bg-gray-200 transition"
            >
              CREATE THE FIRST ONE
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lineups.map(lineup => (
                <Link
                  key={lineup.id}
                  to={`/lineup/${lineup.id}`}
                  className="group border-2 border-white/50 hover:border-white transition"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 uppercase group-hover:text-gray-300 transition">
                      {lineup.title}
                    </h3>
                    {lineup.description && (
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                        "{lineup.description}"
                      </p>
                    )}
                    <p className="text-gray-600 text-sm mb-4 uppercase">
                      {lineup.creator_username && <>@{lineup.creator_username} &middot; </>}
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
                  </div>
                </Link>
              ))}
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
