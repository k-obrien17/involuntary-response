import { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import EmbedInput from './EmbedInput';
import TagInput from './TagInput';

const SOFT_LIMIT = 800;
const HARD_LIMIT = 1200;

export default function PostForm({ initialData, onSubmit, submitting }) {
  const [body, setBody] = useState(initialData?.body || '');
  const [embed, setEmbed] = useState(initialData?.embed || null);
  const [tags, setTags] = useState(initialData?.tags || []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      body: body.trim(),
      embedUrl: embed?.originalUrl || null,
      tags,
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
          className="w-full border border-gray-300 rounded-lg p-4 text-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
        <p className={`text-sm text-right mt-1 ${charColor}`}>
          {body.length} / ~{SOFT_LIMIT}
        </p>
      </div>

      <EmbedInput embed={embed} onChange={setEmbed} />

      <TagInput tags={tags} onChange={setTags} maxTags={5} />

      <button
        type="submit"
        disabled={isDisabled}
        className="bg-gray-900 text-white px-6 py-3 text-sm font-medium rounded hover:bg-gray-800 transition disabled:opacity-50"
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
