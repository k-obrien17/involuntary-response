import { useState } from 'react';
import { Plus, Check, ExternalLink } from 'lucide-react';
import type { VaultExecutive, CreateQuoteInput, VaultFile } from '../lib/types';
import { VOICE_SOURCE_TYPES, CONFIDENCE_LEVELS } from '../lib/types';
import { openInObsidian } from '../lib/obsidian';

interface QuoteInputProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  onSubmit: (voicePath: string, speaker: string, input: CreateQuoteInput) => Promise<VaultFile>;
}

export function QuoteInput({
  executives,
  selectedExecutive,
  onSelectExecutive,
  onSubmit,
}: QuoteInputProps) {
  const [title, setTitle] = useState('');
  const [organizingQuestion, setOrganizingQuestion] = useState('');
  const [verbatimQuote, setVerbatimQuote] = useState('');
  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState('interview');
  const [dateSpoken, setDateSpoken] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [confidence, setConfidence] = useState('high');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastCreatedPath, setLastCreatedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutive) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const topics = topicsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await onSubmit(selectedExecutive.voice_path, selectedExecutive.name, {
        title,
        organizing_question: organizingQuestion,
        verbatim_quote: verbatimQuote,
        source,
        source_type: sourceType,
        date_spoken: dateSpoken,
        topics,
        confidence,
      });

      setLastCreatedPath(created.path);
      setSuccess('Quote saved to vault');
      setTitle('');
      setOrganizingQuestion('');
      setVerbatimQuote('');
      setSource('');
      setDateSpoken('');
      setTopicsText('');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Voice Quote</h2>

      {/* Executive selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Executive</label>
        <select
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={selectedExecutive?.voice_path || ''}
          onChange={(e) => {
            const exec = executives.find((ex) => ex.voice_path === e.target.value);
            if (exec) onSelectExecutive(exec);
          }}
        >
          <option value="">Select an executive...</option>
          {executives.map((exec) => (
            <option key={exec.voice_path} value={exec.voice_path}>
              {exec.name}
            </option>
          ))}
        </select>
      </div>

      {selectedExecutive && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (short label for this quote)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Technology builds trust and loyalty"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organizing Question
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={organizingQuestion}
              onChange={(e) => setOrganizingQuestion(e.target.value)}
              placeholder="What key strategies have you implemented..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verbatim Quote</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
              value={verbatimQuote}
              onChange={(e) => setVerbatimQuote(e.target.value)}
              placeholder="Paste the exact quote here..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source / Publication
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Authority Magazine Q&A"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Spoken</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={dateSpoken}
                onChange={(e) => setDateSpoken(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                {VOICE_SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              >
                {CONFIDENCE_LEVELS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topics (comma-separated)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder="technology, competitive-advantage, culture"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </span>
              {lastCreatedPath && (
                <button
                  onClick={() => openInObsidian(lastCreatedPath)}
                  className="flex items-center gap-1.5 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Obsidian
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Saving...' : 'Save Quote to Vault'}
          </button>
        </form>
      )}
    </div>
  );
}
