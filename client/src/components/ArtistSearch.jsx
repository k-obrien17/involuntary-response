import { useState, useEffect } from 'react';
import { artists } from '../api/client';

export default function ArtistSearch({ onSelect, disabled, selectedArtists = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const res = await artists.search(query);
        setResults(res.data.artists || []);
      } catch (err) {
        setError('Failed to search artists');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (artist) => {
    onSelect(artist);
    setQuery('');
    setResults([]);
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={disabled ? 'LINEUP FULL!' : 'SEARCH FOR AN ARTIST...'}
          disabled={disabled}
          className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none disabled:opacity-50 uppercase"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            ...
          </div>
        )}
      </div>

      {error && <p className="text-white mt-2 text-sm uppercase">{error}</p>}

      {results.length > 0 && (
        <div className="mt-0 bg-black border-2 border-t-0 border-white max-h-96 overflow-y-auto">
          {results.map((artist) => {
            const isSelected = selectedArtists.includes(artist.name);
            return (
              <button
                key={artist.spotifyId || artist.name}
                onClick={() => !isSelected && handleSelect(artist)}
                disabled={isSelected}
                className={`w-full flex items-center gap-4 p-3 hover:bg-white hover:text-black transition text-left uppercase ${
                  isSelected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {artist.image ? (
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-12 h-12 object-cover border border-white/50"
                  />
                ) : (
                  <div className="w-12 h-12 bg-white/10 border border-white/50 flex items-center justify-center text-gray-500 font-bold">
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{artist.name}</p>
                  {artist.popularity != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-white/20">
                        <div
                          className="h-full bg-white"
                          style={{ width: `${artist.popularity}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs">{artist.popularity}</span>
                    </div>
                  )}
                </div>
                {artist.spotifyUrl && !isSelected && (
                  <a
                    href={artist.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-500 hover:text-green-400 text-[10px] tracking-wide shrink-0"
                  >
                    SPOTIFY
                  </a>
                )}
                {isSelected && (
                  <span className="ml-auto text-sm shrink-0">ADDED</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
