import { useState, useEffect } from 'react';
import { PenTool, FileText, User, ChevronRight } from 'lucide-react';
import type { VaultFile } from '../lib/types';
import * as api from '../lib/api';
import { useExecutive } from '../contexts/ExecutiveContext';

interface HomeScreenProps {
  onQuickDraft: (topic: string, format: string) => void;
  onNavigate: (view: 'home' | 'add' | 'write' | 'library' | 'settings') => void;
}

interface VoiceHealthDisplay {
  level: string;
  label: string;
  color: string;
  icon: string;
  quotesNeedRefresh: boolean;
}

function healthToDisplay(health: api.VoiceHealth | null): VoiceHealthDisplay {
  if (!health) {
    return { level: 'unknown', label: 'Loading...', color: 'text-gray-400', icon: '⚪', quotesNeedRefresh: false };
  }

  const colorMap: Record<string, string> = {
    'needs-material': 'text-red-500',
    'building': 'text-amber-500',
    'ready': 'text-emerald-500',
  };

  return {
    level: health.level,
    label: health.label,
    color: colorMap[health.level] || 'text-gray-500',
    icon: health.icon,
    quotesNeedRefresh: health.quotes_since_refresh >= 5,
  };
}

interface RecentDraft {
  executive_name: string;
  file: VaultFile;
  status: string;
}

export function HomeScreen({ onQuickDraft, onNavigate }: HomeScreenProps) {
  const { executives, selectedExecutive, setSelectedExecutive } = useExecutive();
  const [quickTopic, setQuickTopic] = useState('');
  const [quickFormat, setQuickFormat] = useState('social-post');
  const [recentDrafts, setRecentDrafts] = useState<RecentDraft[]>([]);
  const [executiveHealth, setExecutiveHealth] = useState<Map<string, VoiceHealthDisplay>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load recent drafts
        const drafts = await api.listAllDrafts();
        setRecentDrafts(
          drafts.slice(0, 5).map((d) => ({
            executive_name: d.executive_name,
            file: d.file,
            status: String(d.file.frontmatter.status || 'draft'),
          }))
        );

        // Load health for all executives using new API
        const healthMap = new Map<string, VoiceHealthDisplay>();
        for (const exec of executives) {
          try {
            const health = await api.getVoiceHealth(exec.voice_path);
            healthMap.set(exec.voice_path, healthToDisplay(health));
          } catch {
            healthMap.set(exec.voice_path, healthToDisplay(null));
          }
        }
        setExecutiveHealth(healthMap);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [executives]);

  const handleQuickDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTopic.trim()) return;
    onQuickDraft(quickTopic, quickFormat);
  };

  const FORMATS = [
    { value: 'social-post', label: 'LinkedIn Post' },
    { value: 'talking-points', label: 'Talking Points' },
    { value: 'op-ed', label: 'Op-Ed' },
    { value: 'memo', label: 'Memo' },
    { value: 'email', label: 'Email' },
    { value: 'blog-post', label: 'Blog Post' },
  ];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-gray-100 text-gray-700',
      draft: 'bg-gray-100 text-gray-700',
      pending_review: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      published: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      queued: 'Queued',
      draft: 'Draft',
      pending_review: 'Review',
      approved: 'Approved',
      published: 'Published',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Draft Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">What do you want to write?</h2>
        <form onSubmit={handleQuickDraft} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={quickTopic}
              onChange={(e) => setQuickTopic(e.target.value)}
              placeholder="Enter topic or idea..."
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <select
              value={quickFormat}
              onChange={(e) => setQuickFormat(e.target.value)}
              className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!quickTopic.trim() || !selectedExecutive}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PenTool className="w-4 h-4" />
              Generate
            </button>
          </div>
          {selectedExecutive && (
            <p className="text-sm text-gray-500">
              Writing for: <span className="font-medium text-gray-700">{selectedExecutive.name}</span>
            </p>
          )}
          {!selectedExecutive && executives.length > 0 && (
            <p className="text-sm text-amber-600">Select an executive from the sidebar to start writing.</p>
          )}
        </form>
      </div>

      {/* Recent Drafts */}
      {recentDrafts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Drafts</h3>
            <button
              onClick={() => onNavigate('library')}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {recentDrafts.map((draft) => (
              <div
                key={draft.file.path}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => onNavigate('library')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {String(draft.file.frontmatter.draft_topic || draft.file.filename)}
                    </p>
                    <p className="text-xs text-gray-500">{draft.executive_name}</p>
                  </div>
                </div>
                {getStatusBadge(draft.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executives Grid */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Executives</h3>
        {executives.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No executives found</p>
            <p className="text-sm text-gray-400">
              Create a <code className="bg-gray-100 px-1 rounded">Voice/</code> folder inside a contact folder to add one.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {executives.map((exec) => {
              const health = executiveHealth.get(exec.voice_path) || healthToDisplay(null);
              const isSelected = selectedExecutive?.voice_path === exec.voice_path;

              return (
                <button
                  key={exec.voice_path}
                  onClick={() => setSelectedExecutive(exec)}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}
                    >
                      <User className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {exec.name}
                      </p>
                      <p className={`text-xs ${health.color}`}>
                        {health.icon} {health.label}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
