import { useState, useEffect, useRef } from 'react';
import { browse } from '../api/client';

export default function TagInput({ tags, onChange, maxTags = 5 }) {
  const [input, setInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    browse.tags().then((res) => setAllTags(res.data.tags || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    const query = input.toLowerCase().trim();
    const filtered = allTags
      .filter((t) => t.includes(query) && !tags.includes(t))
      .slice(0, 8);
    setSuggestions(filtered);
    setActiveIndex(-1);
  }, [input, allTags, tags]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag) => {
    const cleaned = tag.toLowerCase().trim().replace(/[^a-z0-9\- ]/g, '').slice(0, 30);
    if (cleaned && !tags.includes(cleaned) && tags.length < maxTags) {
      onChange([...tags, cleaned]);
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
    } else if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        addTag(suggestions[activeIndex]);
      } else {
        addTag(input);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
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
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Add a tag and press Enter"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  onMouseDown={() => addTag(s)}
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
        {tags.length}/{maxTags} tags
      </p>
    </div>
  );
}
