import { useState } from 'react';

export default function TagInput({ tags, onChange, maxTags = 5 }) {
  const [input, setInput] = useState('');

  const addTag = (value) => {
    const tag = value.toLowerCase().replace(/[^a-z0-9\- ]/g, '').trim().slice(0, 30);
    if (tag && !tags.includes(tag) && tags.length < maxTags) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white text-sm uppercase">
            {tag}
            <button onClick={() => removeTag(i)} className="text-gray-500 hover:text-white ml-1">&times;</button>
          </span>
        ))}
      </div>
      {tags.length < maxTags && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? 'ADD TAGS (E.G. ROCK, CHILL, 90S)...' : 'ADD ANOTHER TAG...'}
          className="w-full px-4 py-2 bg-black border border-white/30 text-white placeholder-gray-600 focus:outline-none focus:border-white text-sm uppercase"
        />
      )}
    </div>
  );
}
