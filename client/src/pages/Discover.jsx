import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { stats } from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lineups, setLineups] = useState([]);
  const [siteStats, setSiteStats] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('recent');
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || '');
  const limit = 12;

  useEffect(() => {
    stats.tags().then(res => setAllTags(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lineupsRes, statsRes] = await Promise.all([
          stats.browse(limit, page * limit, sort, activeTag || undefined),
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
  }, [page, sort, activeTag]);

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

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => { setActiveTag(''); setPage(0); setSearchParams({}); }}
              className={`px-3 py-1 text-sm uppercase font-bold transition ${!activeTag ? 'bg-white text-black' : 'border border-white/30 text-gray-500 hover:border-white hover:text-white'}`}
            >
              ALL
            </button>
            {allTags.map(t => (
              <button
                key={t.tag}
                onClick={() => { setActiveTag(t.tag); setPage(0); setSearchParams({ tag: t.tag }); }}
                className={`px-3 py-1 text-sm uppercase transition ${activeTag === t.tag ? 'bg-white text-black font-bold' : 'border border-white/30 text-gray-500 hover:border-white hover:text-white'}`}
              >
                {t.tag} ({t.count})
              </button>
            ))}
          </div>
        )}

        {/* Lineups Grid */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold uppercase tracking-wide">
            {activeTag ? `"${activeTag}" LINEUPS` : 'LINEUPS'}
          </h2>
          <div className="flex gap-2">
            {['recent', 'oldest', 'likes'].map(s => (
              <button
                key={s}
                onClick={() => { setSort(s); setPage(0); }}
                className={`px-3 py-1 text-sm uppercase transition ${sort === s ? 'bg-white text-black font-bold' : 'border border-white/30 text-gray-500 hover:border-white hover:text-white'}`}
              >
                {s === 'likes' ? 'TOP' : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

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
                      {lineup.creator_username && (
                        <Link to={`/user/${lineup.creator_username}`} onClick={e => e.stopPropagation()} className="hover:text-white transition">@{lineup.creator_username}</Link>
                      )}
                      {lineup.creator_username && ' · '}
                      {lineup.like_count > 0 && <>{lineup.like_count} LIKE{lineup.like_count !== 1 ? 'S' : ''} · </>}
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
