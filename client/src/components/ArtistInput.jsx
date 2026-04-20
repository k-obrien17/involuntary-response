import { useState, useEffect, useRef } from 'react';
import { browse } from '../api/client';

export default function ArtistInput({ artists, onChange, maxArtists = 2 }) {
  const [input, setInput] = useState('');
  const [allArtists, setAllArtists] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    browse.artists().then((res) => setAllArtists(res.data.artists || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    const query = input.toLowerCase().trim();
    const filtered = allArtists
      .filter((a) => a.toLowerCase().includes(query) && !artists.some((x) => x.toLowerCase() === a.toLowerCase()))
      .slice(0, 8);
    setSuggestions(filtered);
    setActiveIndex(-1);
  }, [input, allArtists, artists]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addArtist = (name) => {
    const cleaned = name.trim().slice(0, 200);
    if (!cleaned) return;
    const exists = artists.some((a) => a.toLowerCase() === cleaned.toLowerCase());
    if (!exists && artists.length < maxArtists) {
      onChange([...artists, cleaned]);
    }
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        addArtist(suggestions[activeIndex]);
      } else if (input.trim()) {
        addArtist(input);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !input && artists.length > 0) {
      onChange(artists.slice(0, -1));
    }
  };

  const removeArtist = (name) => {
    onChange(artists.filter((a) => a !== name));
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Artist (optional)
      </label>
      <div className="flex flex-wrap gap-2">
        {artists.map((name) => (
          <span
            key={name}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm px-2 py-1 rounded-full inline-flex items-center"
          >
            {name}
            <button
              type="button"
              onClick={() => removeArtist(name)}
              className="ml-1 text-gray-400 dark:text-gray-500 hover:text-red-600"
            >
              x
            </button>
          </span>
        ))}
      </div>
      {artists.length < maxArtists && (
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => { if (!suggestions.length) addArtist(input); }}
            placeholder={artists.length === 0 ? 'Auto-detected from embed, or type and press Enter' : 'Add another artist'}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  onMouseDown={() => addArtist(s)}
                  className={`px-4 py-2 text-sm cursor-pointer transition ${
                    i === activeIndex
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Leave blank if a Spotify or Apple Music link is provided — artists are detected automatically.
      </p>
    </div>
  );
}
