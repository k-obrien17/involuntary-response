import { useState, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import EmbedInput from './EmbedInput';
import TagInput from './TagInput';

const SOFT_LIMIT = 800;
const HARD_LIMIT = 1200;

function toLocalDatetimeValue(isoString) {
  const d = new Date(isoString);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getMinDateTime() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function PostForm({ initialData, onSubmit, onSaveDraft, onSchedule, initialScheduledAt, submitting }) {
  const [body, setBody] = useState(initialData?.body || '');
  const [embed, setEmbed] = useState(initialData?.embed || null);
  const [tags, setTags] = useState(initialData?.tags || []);
  const [artistName, setArtistName] = useState(initialData?.artistName || '');
  const [scheduledAt, setScheduledAt] = useState(
    initialScheduledAt ? toLocalDatetimeValue(initialScheduledAt) : ''
  );

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

  const formData = {
    body: body.trim(),
    embedUrl: embed?.originalUrl || null,
    tags,
    artistName: artistName.trim() || null,
  };

  const draftButtonLabel = initialScheduledAt
    ? (submitting ? 'Saving...' : 'Cancel schedule')
    : (submitting ? 'Saving...' : 'Save as draft');

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

      {onSchedule && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schedule for later
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={getMinDateTime()}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 mt-1"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Pick a date and time to auto-publish. Uses your local timezone.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {onSaveDraft && (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onSaveDraft(formData)}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            {draftButtonLabel}
          </button>
        )}
        {onSchedule && scheduledAt && (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onSchedule({ ...formData, scheduledAt: new Date(scheduledAt).toISOString() })}
            className="bg-blue-600 text-white px-6 py-3 text-sm font-medium rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : initialScheduledAt ? 'Reschedule' : 'Schedule'}
          </button>
        )}
        <button
          type="submit"
          disabled={isDisabled}
          className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-6 py-3 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
        >
          {submitting
            ? 'Saving...'
            : onSaveDraft
              ? 'Publish'
              : initialData
                ? 'Save changes'
                : 'Publish'}
        </button>
      </div>
    </form>
  );
}
