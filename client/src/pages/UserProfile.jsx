import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { users } from '../api/client';
import Navbar from '../components/Navbar';

export default function UserProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await users.getProfile(username);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'User not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

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
          <Link to="/discover" className="text-gray-500 hover:text-white uppercase border-b border-gray-500 hover:border-white">
            BROWSE LINEUPS
          </Link>
        </div>
      </div>
    );
  }

  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-white text-black flex items-center justify-center text-4xl font-bold mx-auto mb-4">
            {initial}
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tight mb-2">@{profile.username}</h1>
          <p className="text-gray-500 uppercase text-sm">
            {profile.lineup_count} LINEUP{profile.lineup_count !== 1 ? 'S' : ''} &middot; JOINED {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Lineups Grid */}
        {profile.lineups.length === 0 ? (
          <p className="text-center text-gray-500 uppercase">NO PUBLIC LINEUPS YET</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.lineups.map(lineup => (
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
                      &ldquo;{lineup.description}&rdquo;
                    </p>
                  )}
                  <p className="text-gray-600 text-sm mb-4 uppercase">
                    {lineup.like_count > 0 && <>{lineup.like_count} LIKE{lineup.like_count !== 1 ? 'S' : ''} &middot; </>}
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

                  {lineup.tags.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
