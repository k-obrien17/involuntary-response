import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, PenTool, ExternalLink, Eye, Trash2, Users } from 'lucide-react';
import type { VaultExecutive, VaultFile } from '../lib/types';
import { PUBLISH_PLATFORMS, PUBLISH_PLATFORM_LABELS, type PublishPlatform } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';

interface ContentTrackerProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  onWriteDraft?: (draft: VaultFile) => void;
}

type DraftStatus = 'queued' | 'draft' | 'pending_review' | 'approved' | 'published';

const STATUS_ORDER: DraftStatus[] = ['queued', 'draft', 'pending_review', 'approved', 'published'];

const STATUS_LABELS: Record<DraftStatus, string> = {
  queued: 'Queued',
  draft: 'Draft',
  pending_review: 'In Review',
  approved: 'Approved',
  published: 'Published',
};

const STATUS_COLORS: Record<DraftStatus, string> = {
  queued: 'bg-gray-100 text-gray-700',
  draft: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-purple-100 text-purple-700',
};

export function ContentTracker({
  executives,
  selectedExecutive,
  onSelectExecutive,
  onWriteDraft,
}: ContentTrackerProps) {
  const [drafts, setDrafts] = useState<VaultFile[]>([]);
  const [draftsWithExec, setDraftsWithExec] = useState<api.DraftWithExecutive[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<DraftStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewAllExecutives, setViewAllExecutives] = useState(false);

  // Queue form state
  const [queueTopic, setQueueTopic] = useState('');
  const [queueFormat, setQueueFormat] = useState('social-post');
  const [queueNotes, setQueueNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Publish modal state
  const [publishingDraft, setPublishingDraft] = useState<VaultFile | null>(null);
  const [publishUrl, setPublishUrl] = useState('');
  const [publishPlatform, setPublishPlatform] = useState<PublishPlatform>('linkedin');

  useEffect(() => {
    if (viewAllExecutives) {
      loadAllDrafts();
    } else if (selectedExecutive) {
      loadDrafts();
    }
  }, [selectedExecutive, viewAllExecutives]);

  const loadDrafts = async () => {
    if (!selectedExecutive) return;
    setLoading(true);
    try {
      const files = await api.listVoiceFiles(selectedExecutive.voice_path, 'voice-draft');
      setDrafts(files.reverse());
      setDraftsWithExec([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadAllDrafts = async () => {
    setLoading(true);
    try {
      const allDrafts = await api.listAllDrafts();
      setDraftsWithExec(allDrafts);
      setDrafts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draft: VaultFile) => {
    const topic = draft.frontmatter.draft_topic as string || draft.filename;
    if (!confirm(`Delete "${topic}"? This cannot be undone.`)) return;
    try {
      await api.deleteVaultFile(draft.path);
      if (viewAllExecutives) {
        await loadAllDrafts();
      } else {
        await loadDrafts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePublish = async () => {
    if (!publishingDraft || !publishUrl.trim()) return;
    try {
      await api.publishDraft(publishingDraft.path, publishUrl.trim(), publishPlatform);
      setPublishingDraft(null);
      setPublishUrl('');
      setPublishPlatform('linkedin');
      if (viewAllExecutives) {
        await loadAllDrafts();
      } else {
        await loadDrafts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutive || !queueTopic) return;
    setSaving(true);
    setError(null);

    try {
      await api.createDraftPlaceholder(
        selectedExecutive.voice_path,
        selectedExecutive.name,
        queueTopic,
        queueFormat,
        queueNotes,
      );
      setQueueTopic('');
      setQueueNotes('');
      setShowForm(false);
      await loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (draft: VaultFile, newStatus: string) => {
    // If changing to published, show the publish modal instead
    if (newStatus === 'published') {
      setPublishingDraft(draft);
      return;
    }
    try {
      await api.updateFileStatus(draft.path, newStatus);
      if (viewAllExecutives) {
        await loadAllDrafts();
      } else {
        await loadDrafts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Build unified list for filtering/display
  const allItems = viewAllExecutives
    ? draftsWithExec.map((d) => ({ file: d.file, execName: d.executive_name }))
    : drafts.map((d) => ({ file: d, execName: selectedExecutive?.name || '' }));

  const filtered = filter === 'all'
    ? allItems
    : allItems.filter((d) => d.file.frontmatter.status === filter);

  const statusCounts = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = allItems.filter((d) => d.file.frontmatter.status === s).length;
      return acc;
    },
    {} as Record<DraftStatus, number>,
  );

  const FORMATS = [
    'social-post',
    'talking-points',
    'op-ed',
    'memo',
    'email',
    'speech-excerpt',
    'press-release',
    'blog-post',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Content Tracker</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Queue Idea'}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={viewAllExecutives ? '__all__' : (selectedExecutive?.voice_path || '')}
          onChange={(e) => {
            if (e.target.value === '__all__') {
              setViewAllExecutives(true);
            } else {
              setViewAllExecutives(false);
              const exec = executives.find((ex) => ex.voice_path === e.target.value);
              if (exec) onSelectExecutive(exec);
            }
          }}
        >
          <option value="">Select executive...</option>
          <option value="__all__">All Executives</option>
          {executives.map((exec) => (
            <option key={exec.voice_path} value={exec.voice_path}>
              {exec.name}
            </option>
          ))}
        </select>
        {viewAllExecutives && (
          <span className="flex items-center gap-1 text-sm text-indigo-600">
            <Users className="w-4 h-4" />
            Viewing all
          </span>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      {showForm && selectedExecutive && (
        <form onSubmit={handleQueue} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What do you want to write about?
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={queueTopic}
              onChange={(e) => setQueueTopic(e.target.value)}
              placeholder="Topic or idea for a future post..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={queueFormat}
              onChange={(e) => setQueueFormat(e.target.value)}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
              value={queueNotes}
              onChange={(e) => setQueueNotes(e.target.value)}
              placeholder="Key angle, trigger event, data to include..."
            />
          </div>
          <button
            type="submit"
            disabled={saving || !queueTopic}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : 'Add to Queue'}
          </button>
        </form>
      )}

      {(selectedExecutive || viewAllExecutives) && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? 'all' : s)}
                className={`text-center p-3 rounded-lg transition-colors ${
                  filter === s
                    ? 'ring-2 ring-indigo-500 ' + STATUS_COLORS[s]
                    : 'bg-white shadow-sm hover:shadow'
                }`}
              >
                <div className="text-2xl font-bold">{statusCounts[s]}</div>
                <div className="text-xs text-gray-500">{STATUS_LABELS[s]}</div>
              </button>
            ))}
          </div>

          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-sm text-indigo-600 hover:underline mb-3"
            >
              Show all
            </button>
          )}

          {loading ? (
            <div className="flex items-center gap-3 py-8">
              <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              <span className="text-gray-600">Loading...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {allItems.length === 0
                ? 'No content yet. Queue an idea or generate a draft.'
                : 'No items match this filter.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(({ file: d, execName }) => {
                const status = (d.frontmatter.status as DraftStatus) || 'draft';
                const draftFormat = d.frontmatter.draft_format as string || '';
                const draftTopic = d.frontmatter.draft_topic as string || d.filename;
                const created = d.frontmatter.created as string || '';
                const publishUrl = d.frontmatter.publish_url as string || '';
                const isExpanded = expandedId === d.path;

                return (
                  <div key={d.path} className="bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3 p-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{draftTopic}</div>
                        <div className="flex gap-3 text-xs text-gray-500">
                          {viewAllExecutives && <span className="font-medium text-indigo-600">{execName}</span>}
                          {draftFormat && (
                            <span>{draftFormat.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                          )}
                          {created && <span>{created}</span>}
                          {publishUrl && (
                            <a href={publishUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                              View published
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : d.path)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {status === 'queued' && onWriteDraft && !viewAllExecutives && (
                          <button
                            onClick={() => onWriteDraft(d)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            title="Write this draft"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            Write
                          </button>
                        )}

                        <button
                          onClick={() => openInObsidian(d.path)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title="Open in Obsidian"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(d)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="relative">
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(d, e.target.value)}
                            className="appearance-none pl-2 pr-6 py-1.5 text-xs border rounded-lg bg-white cursor-pointer"
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t">
                        <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap max-h-[300px] overflow-auto">
                          {d.body}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Publish Modal */}
      {publishingDraft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Publish Draft</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add the URL where this content was published.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={publishPlatform}
                  onChange={(e) => setPublishPlatform(e.target.value as PublishPlatform)}
                >
                  {PUBLISH_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PUBLISH_PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Published URL</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={publishUrl}
                  onChange={(e) => setPublishUrl(e.target.value)}
                  placeholder="https://linkedin.com/posts/..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setPublishingDraft(null);
                  setPublishUrl('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={!publishUrl.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Mark as Published
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
