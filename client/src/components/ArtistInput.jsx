import { useState } from 'react';

export default function ArtistInput({ artists, onChange, maxArtists = 2 }) {
  const [input, setInput] = useState('');

  const commit = () => {
    const cleaned = input.trim().slice(0, 200);
    if (!cleaned) return;
    const exists = artists.some((a) => a.toLowerCase() === cleaned.toLowerCase());
    if (!exists && artists.length < maxArtists) {
      onChange([...artists, cleaned]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !input && artists.length > 0) {
      onChange(artists.slice(0, -1));
    }
  };

  const removeArtist = (name) => {
    onChange(artists.filter((a) => a !== name));
  };

  return (
    <div className="space-y-2">
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={artists.length === 0 ? 'Auto-detected from embed, or type and press Enter' : 'Add another artist'}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400"
        />
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Leave blank if a Spotify or Apple Music link is provided — artists are detected automatically.
      </p>
    </div>
  );
}
