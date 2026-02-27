import { useState } from 'react';
import { parseEmbedUrl } from '../utils/embedParser';
import EmbedPreview from './EmbedPreview';

export default function EmbedInput({ embed, onChange }) {
  const [url, setUrl] = useState(embed?.originalUrl || '');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setUrl(value);

    if (!value.trim()) {
      setError('');
      onChange(null);
      return;
    }

    const parsed = parseEmbedUrl(value.trim());
    if (parsed) {
      setError('');
      onChange(parsed);
    } else {
      setError('Paste a Spotify or Apple Music track or album URL');
      onChange(null);
    }
  };

  const handleRemove = () => {
    setUrl('');
    setError('');
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Music embed (optional)
      </label>
      <input
        type="text"
        value={url}
        onChange={handleChange}
        placeholder="Paste a Spotify or Apple Music URL"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {embed && (
        <div className="space-y-2">
          <EmbedPreview embed={embed} />
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Remove embed
          </button>
        </div>
      )}
    </div>
  );
}
