import { useState } from 'react';

export default function TagInput({ tags, onChange, maxTags = 5 }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const cleaned = input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\- ]/g, '')
        .slice(0, 30);

      if (cleaned && !tags.includes(cleaned) && tags.length < maxTags) {
        onChange([...tags, cleaned]);
      }
      setInput('');
    }
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Tags
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm px-2 py-1 rounded-full inline-flex items-center"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-gray-400 dark:text-gray-500 hover:text-red-600"
            >
              x
            </button>
          </span>
        ))}
      </div>
      {tags.length < maxTags && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag and press Enter"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400"
        />
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {tags.length}/{maxTags} tags
      </p>
    </div>
  );
}
