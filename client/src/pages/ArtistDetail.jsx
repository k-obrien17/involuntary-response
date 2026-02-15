import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { stats } from '../api/client';
import Navbar from '../components/Navbar';

export default function ArtistDetail() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArtist = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await stats.artist(name);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Artist not found');
      } finally {
        setLoading(false);
      }
    };
    fetchArtist();
  }, [name]);

  const slotLabels = ['OPENER', 'SECOND', 'THIRD', 'FOURTH', 'HEADLINER'];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <p className="text-white text-xl uppercase">LOADING...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-white text-xl mb-4 uppercase">{error}</p>
          <Link to="/leaderboard" className="text-gray-500 hover:text-white uppercase border-b border-gray-500 hover:border-white">
            BACK TO LEADERBOARD
          </Link>
        </div>
      </div>
    );
  }

  const { stats: artistStats, lineups, pairings } = data;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Artist Header */}
        <div className="text-center mb-12">
          {artistStats.artist_image ? (
            <img
              src={artistStats.artist_image}
              alt={artistStats.artist_name}
              className="w-32 h-32 object-cover mx-auto mb-6 border-4 border-white"
            />
          ) : (
            <div className="w-32 h-32 bg-white/10 border-4 border-white flex items-center justify-center text-4xl mx-auto mb-6 text-gray-500 font-bold">
              ?
            </div>
          )}
          <h1 className="text-5xl font-bold mb-4 uppercase tracking-tight">
            {artistStats.artist_name}
          </h1>
          <p className="text-gray-500 text-lg uppercase">
            FEATURED IN {artistStats.lineup_count} LINEUP{artistStats.lineup_count !== 1 ? 'S' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Stats Card */}
          <div className="lg:col-span-1">
            <div className="border-2 border-white p-6">
              <h2 className="text-xl font-bold mb-6 uppercase">POSITION BREAKDOWN</h2>

              <div className="space-y-4">
                {[
                  { label: 'HEADLINER', count: artistStats.headliner_count },
                  { label: 'FOURTH', count: artistStats.coheadliner_count },
                  { label: 'THIRD', count: artistStats.special_guest_count },
                  { label: 'SECOND', count: artistStats.opener_count },
                  { label: 'OPENER', count: artistStats.local_opener_count },
                ].map(slot => (
                  <div key={slot.label} className="flex items-center justify-between">
                    <span className="text-gray-500 uppercase">{slot.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/20">
                        <div
                          className="h-full bg-white"
                          style={{ width: `${(slot.count / artistStats.lineup_count) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-bold w-8 text-right">{slot.count}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t-2 border-white">
                <p className="text-gray-500 text-sm uppercase">AVERAGE POSITION</p>
                <p className="text-2xl font-bold uppercase">
                  {slotLabels[Math.round(artistStats.avg_position)] || 'N/A'}
                </p>
              </div>
            </div>

            {/* Commonly Paired With */}
            {pairings.length > 0 && (
              <div className="border-2 border-white p-6 mt-6">
                <h2 className="text-xl font-bold mb-4 uppercase">OFTEN PAIRED WITH</h2>
                <div className="space-y-2">
                  {pairings.map(pair => (
                    <Link
                      key={pair.artist_name}
                      to={`/artist/${encodeURIComponent(pair.artist_name)}`}
                      className="flex items-center justify-between p-2 hover:bg-white hover:text-black transition uppercase"
                    >
                      <span>{pair.artist_name}</span>
                      <span className="text-sm">{pair.pair_count}X</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lineups List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6 uppercase">FEATURED IN THESE LINEUPS</h2>
            <div className="space-y-4">
              {lineups.map(lineup => (
                <Link
                  key={lineup.id}
                  to={`/lineup/${lineup.id}`}
                  className="block border-2 border-white/50 hover:border-white p-4 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold uppercase">{lineup.title}</h3>
                      <p className="text-gray-600 text-sm uppercase">
                        {lineup.creator_username && (
                          <><Link to={`/user/${lineup.creator_username}`} className="hover:text-white transition">@{lineup.creator_username}</Link> &middot; </>
                        )}
                        {new Date(lineup.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-bold uppercase border ${
                      lineup.slot_position === 4 ? 'border-white bg-white text-black' :
                      lineup.slot_position === 3 ? 'border-white/70' :
                      'border-white/30 text-gray-500'
                    }`}>
                      {slotLabels[lineup.slot_position]}
                    </span>
                  </div>

                  {lineup.artist_note && (
                    <p className="text-gray-500 text-sm mb-3">
                      "{lineup.artist_note}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {lineup.all_artists.map((a, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 text-sm uppercase ${
                          a.artist_name.toLowerCase() === artistStats.artist_name.toLowerCase()
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/10 text-gray-500'
                        }`}
                      >
                        {a.artist_name}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
