import { useState, useEffect } from 'react';
import { Newspaper, Plus, ExternalLink, FileText, ChevronDown, X } from 'lucide-react';
import type { VaultExecutive, VaultFile } from '../lib/types';
import * as api from '../lib/api';

interface TrendIngestionProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  onDraftFromTrend?: (prefill: { topic: string; articleText: string; notes: string }) => void;
}

const STATUS_LABELS: Record<string, string> = {
  unread: 'Unread',
  flagged: 'Flagged',
  drafted: 'Drafted',
  skipped: 'Skipped',
};

const STATUS_COLORS: Record<string, string> = {
  unread: 'bg-blue-100 text-blue-700',
  flagged: 'bg-amber-100 text-amber-700',
  drafted: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-500',
};

export function TrendIngestion({
  executives,
  selectedExecutive,
  onSelectExecutive,
  onDraftFromTrend,
}: TrendIngestionProps) {
  const [trends, setTrends] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Form state
  const [headline, setHeadline] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [topicTags, setTopicTags] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedExecutive) return;
    loadTrends();
  }, [selectedExecutive]);

  const loadTrends = async () => {
    if (!selectedExecutive) return;
    setLoading(true);
    try {
      const files = await api.listVoiceFiles(selectedExecutive.voice_path, 'voice-trend');
      setTrends(files.reverse()); // newest first
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutive || !headline) return;
    setSaving(true);
    setError(null);

    try {
      const tags = topicTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await api.createTrend(
        selectedExecutive.voice_path,
        selectedExecutive.name,
        headline,
        sourceUrl,
        sourceName,
        tags,
        notes,
      );
      setHeadline('');
      setSourceUrl('');
      setSourceName('');
      setTopicTags('');
      setNotes('');
      setShowForm(false);
      await loadTrends();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (trend: VaultFile, newStatus: string) => {
    try {
      await api.updateTrendStatus(trend.path, newStatus);
      await loadTrends();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const filtered = filter === 'all' ? trends : trends.filter((t) => t.frontmatter.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Trends</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Trend'}
        </button>
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

      {showForm && selectedExecutive && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="What's the headline or trend?"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="WSJ, TechCrunch, LinkedIn..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic Tags</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={topicTags}
              onChange={(e) => setTopicTags(e.target.value)}
              placeholder="AI, regulation, leadership (comma-separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is this relevant to this executive? What angle would they take?"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !headline}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Newspaper className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Trend'}
          </button>
        </form>
      )}

      {selectedExecutive && (
        <>
          <div className="flex gap-2 mb-4">
            {['all', 'unread', 'flagged', 'drafted', 'skipped'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === s
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
                {s !== 'all' && (
                  <span className="ml-1 text-xs">
                    ({trends.filter((t) => t.frontmatter.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-8">
              <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              <span className="text-gray-600">Loading trends...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {trends.length === 0
                ? 'No trends yet. Add one to start tracking what to post about.'
                : 'No trends match this filter.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((trend) => {
                const status = (trend.frontmatter.status as string) || 'unread';
                const tags = trend.frontmatter.topic_tags as string[] | undefined;
                const url = trend.frontmatter.source_url as string | undefined;
                const source = trend.frontmatter.source_name as string | undefined;

                return (
                  <div
                    key={trend.path}
                    className="bg-white rounded-lg shadow p-4 flex items-start gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.unread}`}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                        {source && (
                          <span className="text-xs text-gray-500">{source}</span>
                        )}
                        {typeof trend.frontmatter.created === 'string' && (
                          <span className="text-xs text-gray-400">
                            {trend.frontmatter.created}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{trend.filename}</h3>
                      {tags && tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title="Open source"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {onDraftFromTrend && status !== 'drafted' && (
                        <button
                          onClick={() => {
                            handleStatusChange(trend, 'flagged');
                            const title = trend.frontmatter.draft_topic as string || trend.filename;
                            onDraftFromTrend({
                              topic: title,
                              articleText: trend.body,
                              notes: '',
                            });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          title="Draft from this trend"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Draft
                        </button>
                      )}
                      <div className="relative">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(trend, e.target.value)}
                          className="appearance-none pl-2 pr-6 py-1.5 text-xs border rounded-lg bg-white cursor-pointer"
                        >
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
