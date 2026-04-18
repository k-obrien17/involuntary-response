import { useState, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import EmbedInput from './EmbedInput';
import TagInput from './TagInput';
import ArtistInput from './ArtistInput';
import { categories as categoriesApi } from '../api/client';

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
  const [artistNames, setArtistNames] = useState(initialData?.artistNames || []);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [format, setFormat] = useState(initialData?.format || 'standard');
  const [customSlug, setCustomSlug] = useState('');
  const [scheduledAt, setScheduledAt] = useState(
    initialScheduledAt ? toLocalDatetimeValue(initialScheduledAt) : ''
  );

  useEffect(() => {
    categoriesApi.list().then((res) => setCategoryOptions(res.data.categories)).catch(() => {});
  }, []);

  // Auto-populate artists from embed when resolved (max 2)
  useEffect(() => {
    if (embed?.artists?.length > 0 && artistNames.length === 0) {
      setArtistNames(embed.artists.slice(0, 2).map((a) => a.name));
    }
  }, [embed]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      body: body.trim(),
      embedUrl: embed?.originalUrl || null,
      tags,
      artistNames,
      categoryId: categoryId || null,
      customSlug: customSlug.trim() || null,
      format,
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
    artistNames,
    categoryId: categoryId || null,
    customSlug: customSlug.trim() || null,
    format,
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
        <div className="flex items-center justify-between mt-1">
          <button
            type="button"
            onClick={() => setFormat(format === 'lyrics' ? 'standard' : 'lyrics')}
            className={`text-sm px-2.5 py-0.5 rounded-full border transition ${
              format === 'lyrics'
                ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800'
                : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
            }`}
          >
            {format === 'lyrics' ? 'Lyrics' : 'Lyrics'}
          </button>
          <p className={`text-sm ${charColor}`}>
            {body.length} / ~{SOFT_LIMIT}
          </p>
        </div>
      </div>

      <EmbedInput embed={embed} onChange={setEmbed} />

      <ArtistInput artists={artistNames} onChange={setArtistNames} maxArtists={2} />

      <TagInput tags={tags} onChange={setTags} maxTags={5} />

      {categoryOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Category (optional)
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 mt-1"
          >
            <option value="">None</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {!initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            URL slug (optional)
          </label>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder={embed?.title ? embed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) : 'auto-generated from embed title'}
            maxLength={80}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 mt-1 font-mono"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Leave blank to auto-generate from the embed title.
          </p>
        </div>
      )}

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
