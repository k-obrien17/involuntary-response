import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lineups } from '../api/client';
import Navbar from '../components/Navbar';
import Comments from '../components/Comments';

export default function ViewLineup() {
  const { id } = useParams();
  const [lineup, setLineup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const posterRef = useRef(null);
  const [showSignUpBanner, setShowSignUpBanner] = useState(location.state?.anonymous && !user);

  useEffect(() => {
    if (location.state?.anonymous) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    const fetchLineup = async () => {
      try {
        const [lineupRes, likesRes] = await Promise.all([
          lineups.getOne(id),
          lineups.getLikes(id),
        ]);
        setLineup(lineupRes.data);
        setLiked(likesRes.data.liked);
        setLikeCount(likesRes.data.count);
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

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await lineups.like(id);
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch {}
  };

  const handleRemix = () => {
    navigate('/create', {
      state: {
        remix: {
          title: `Remix: ${lineup.title}`,
          description: lineup.description || '',
          tags: lineup.tags || [],
          artists: lineup.artists.map(a => ({
            name: a.artist_name,
            image: a.artist_image,
            mbid: a.artist_mbid,
            spotifyId: a.artist_spotify_id,
            spotifyUrl: a.artist_spotify_url,
            note: '',
          })),
        }
      }
    });
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(posterRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${lineup.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert('Failed to generate image');
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

      {showSignUpBanner && (
        <div className="border-b-2 border-white bg-black">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <p className="text-gray-400 uppercase text-sm">
              YOUR LINEUP IS LIVE &mdash; <span className="text-white">SIGN UP TO KEEP IT ON YOUR ACCOUNT</span>
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/register"
                className="bg-white text-black px-4 py-2 text-xs font-bold uppercase hover:bg-gray-200 transition"
              >
                SIGN UP
              </Link>
              <button
                onClick={() => setShowSignUpBanner(false)}
                className="text-gray-600 hover:text-white transition text-xs uppercase"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Festival Poster - Brutalist Style */}
          <div ref={posterRef} className="border-4 border-white bg-black">
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
              {lineup.artists.map((artist, index) => {
                const fromEnd = lineup.artists.length - 1 - index;
                const sizeClass = fromEnd === 0 ? 'text-3xl md:text-4xl'
                  : fromEnd === 1 ? 'text-2xl md:text-3xl text-gray-200'
                  : fromEnd === 2 ? 'text-xl md:text-2xl text-gray-300'
                  : 'text-lg md:text-xl text-gray-400';
                const isHeadliner = fromEnd === 0;

                return (
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
                            isHeadliner ? 'w-16 h-16' : 'w-12 h-12'
                          }`}
                        />
                      )}
                      <div className="flex items-baseline gap-2">
                        {artist.artist_spotify_url ? (
                          <a
                            href={artist.artist_spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-bold uppercase tracking-wide hover:underline ${sizeClass}`}
                          >
                            {artist.artist_name}
                          </a>
                        ) : (
                          <span className={`font-bold uppercase tracking-wide ${sizeClass}`}>
                            {artist.artist_name}
                          </span>
                        )}
                        {isHeadliner && (
                          <span className="text-xs text-gray-500 tracking-wide uppercase">(HEADLINER)</span>
                        )}
                        {artist.artist_spotify_url && (
                          <span className="text-gray-600 text-[9px] tracking-wide normal-case">on Spotify</span>
                        )}
                      </div>
                    </div>
                    {artist.note && (
                      <p className="text-gray-500 text-sm mt-2 ml-12 italic">
                        "{artist.note}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tags */}
            {lineup.tags && lineup.tags.length > 0 && (
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                {lineup.tags.map(tag => (
                  <Link key={tag} to={`/discover?tag=${encodeURIComponent(tag)}`} className="px-3 py-1 bg-white/10 text-gray-400 text-xs uppercase hover:bg-white/20 transition">
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="border-t-4 border-white p-4">
              <p className="text-gray-600 text-xs uppercase tracking-widest text-center">
                backyard-marquee.vercel.app
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button
              onClick={handleLike}
              className={`px-8 py-3 font-bold uppercase transition ${
                liked ? 'bg-white text-black' : 'border-2 border-white hover:bg-white hover:text-black'
              }`}
            >
              {liked ? 'LIKED' : 'LIKE'} {likeCount > 0 && `(${likeCount})`}
            </button>
            <button
              onClick={handleShare}
              className="bg-white text-black px-8 py-3 font-bold uppercase hover:bg-gray-200 transition"
            >
              {copied ? 'LINK COPIED' : 'SHARE'}
            </button>
            <button
              onClick={handleRemix}
              className="border-2 border-white px-8 py-3 font-bold uppercase hover:bg-white hover:text-black transition"
            >
              REMIX THIS LINEUP
            </button>
            <button
              onClick={handleDownload}
              className="border-2 border-white px-8 py-3 font-bold uppercase hover:bg-white hover:text-black transition"
            >
              DOWNLOAD IMAGE
            </button>
          </div>

          <p className="text-center text-gray-600 mt-6 text-sm uppercase">
            BY {lineup.creator_username ? (
              <Link to={`/user/${lineup.creator_username}`} className="hover:text-white transition">@{lineup.creator_username}</Link>
            ) : 'ANONYMOUS'} &middot; {new Date(lineup.created_at).toLocaleDateString()}
          </p>

          {/* Comments */}
          <Comments lineupId={id} />
        </div>
      </div>
    </div>
  );
}
