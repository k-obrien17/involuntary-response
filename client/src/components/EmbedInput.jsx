import { useState, useRef } from 'react';
import { embeds } from '../api/client';
import EmbedPreview from './EmbedPreview';

export default function EmbedInput({ embed, onChange }) {
  const [url, setUrl] = useState(embed?.originalUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setUrl(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setError('');
      setLoading(false);
      onChange(null);
      return;
    }

    setLoading(true);
    setError('');

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await embeds.resolve(value.trim());
        setError('');
        setLoading(false);
        onChange(data);
      } catch (err) {
        setLoading(false);
        const msg =
          err.response?.data?.error ||
          'Could not resolve embed URL';
        setError(msg);
        onChange(null);
      }
    }, 500);
  };

  const handleRemove = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setUrl('');
    setError('');
    setLoading(false);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Music or video embed (optional)
      </label>
      <input
        type="text"
        value={url}
        onChange={handleChange}
        placeholder="Paste a music or video link"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      {loading && (
        <p className="text-sm text-gray-500">Resolving embed...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {embed && !loading && (
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
