import { useState, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import EmbedInput from './EmbedInput';
import TagInput from './TagInput';

const SOFT_LIMIT = 800;
const HARD_LIMIT = 1200;

export default function PostForm({ initialData, onSubmit, submitting }) {
  const [body, setBody] = useState(initialData?.body || '');
  const [embed, setEmbed] = useState(initialData?.embed || null);
  const [tags, setTags] = useState(initialData?.tags || []);
  const [artistName, setArtistName] = useState(initialData?.artistName || '');

  // Auto-populate artist name from embed when resolved
  useEffect(() => {
    if (embed?.artists?.length > 0 && !artistName) {
      setArtistName(embed.artists.map(a => a.name).join(', '));
    }
  }, [embed]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      body: body.trim(),
      embedUrl: embed?.originalUrl || null,
      tags,
      artistName: artistName.trim() || null,
    });
  };

  const charColor =
    body.length > HARD_LIMIT
      ? 'text-red-600 font-medium'
      : body.length > SOFT_LIMIT
        ? 'text-amber-600'
        : 'text-gray-400';

  const isDisabled =
    !body.trim() || body.length > HARD_LIMIT || submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <TextareaAutosize
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What are you listening to?"
          minRows={4}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 resize-none"
        />
        <p className={`text-sm text-right mt-1 ${charColor}`}>
          {body.length} / ~{SOFT_LIMIT}
        </p>
      </div>

      <EmbedInput embed={embed} onChange={setEmbed} />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Artist (optional)
        </label>
        <input
          type="text"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Auto-detected from embed, or type manually"
          maxLength={200}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 mt-1"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Leave blank if a Spotify or Apple Music link is provided — artist is detected automatically.
        </p>
      </div>

      <TagInput tags={tags} onChange={setTags} maxTags={5} />

      <button
        type="submit"
        disabled={isDisabled}
        className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-6 py-3 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
      >
        {submitting
          ? 'Saving...'
          : initialData
            ? 'Save changes'
            : 'Publish'}
      </button>
    </form>
  );
}
