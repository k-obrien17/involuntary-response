import { useState } from 'react';
import { Plus, Lightbulb } from 'lucide-react';
import type { VaultExecutive, VaultFile } from '../lib/types';
import {
  KEYFACT_CATEGORIES,
  KEYFACT_CATEGORY_LABELS,
  type KeyfactCategory,
} from '../lib/types';
import * as api from '../lib/api';

interface KeyfactInputProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  onSaved?: (file: VaultFile) => void;
}

export function KeyfactInput({
  executives,
  selectedExecutive,
  onSelectExecutive,
  onSaved,
}: KeyfactInputProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KeyfactCategory>('career');
  const [factValue, setFactValue] = useState('');
  const [source, setSource] = useState('');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutive || !title.trim() || !factValue.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const file = await api.createKeyfact(
        selectedExecutive.voice_path,
        selectedExecutive.name,
        {
          title: title.trim(),
          fact_category: category,
          fact_value: factValue.trim(),
          source: source.trim(),
          context: context.trim(),
        },
      );
      setSuccess(`Key fact "${title}" saved`);
      setTitle('');
      setFactValue('');
      setSource('');
      setContext('');
      onSaved?.(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-6 h-6 text-amber-500" />
        <h2 className="text-2xl font-bold text-gray-900">Add Key Fact</h2>
      </div>

      <div className="mb-4">
        <select
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={selectedExecutive?.voice_path || ''}
          onChange={(e) => {
            const exec = executives.find((ex) => ex.voice_path === e.target.value);
            if (exec) onSelectExecutive(exec);
          }}
        >
          <option value="">Select executive...</option>
          {executives.map((exec) => (
            <option key={exec.voice_path} value={exec.voice_path}>
              {exec.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4">{success}</div>}

      {selectedExecutive && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Years of Experience, Notable Achievement"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={category}
              onChange={(e) => setCategory(e.target.value as KeyfactCategory)}
            >
              {KEYFACT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {KEYFACT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fact <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              value={factValue}
              onChange={(e) => setFactValue(e.target.value)}
              placeholder="The specific fact or statistic..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Where this fact came from (LinkedIn, interview, etc.)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any additional context about this fact..."
            />
          </div>

          <button
            type="submit"
            disabled={saving || !title.trim() || !factValue.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : 'Add Key Fact'}
          </button>
        </form>
      )}
    </div>
  );
}
