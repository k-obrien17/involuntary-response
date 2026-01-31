import { useState, useEffect } from 'react';
import {
  Quote,
  BookOpen,
  Languages,
  Shield,
  BookMarked,
  Brain,
  Plus,
  Sparkles,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { VaultExecutive, VoiceScoreboard, VaultFile } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';

interface ExecutiveDashboardProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  onNavigate: (view: string) => void;
}

export function ExecutiveDashboard({
  executives,
  selectedExecutive,
  onSelectExecutive,
  onNavigate,
}: ExecutiveDashboardProps) {
  const [scoreboard, setScoreboard] = useState<VoiceScoreboard | null>(null);
  const [kernel, setKernel] = useState<VaultFile | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedExecutive) return;

    setLoading(true);
    Promise.all([
      api.getVoiceScoreboard(selectedExecutive.voice_path),
      api.getVoiceKernel(selectedExecutive.voice_path),
      api.listQuotes(selectedExecutive.voice_path),
    ])
      .then(([sb, k, quotes]) => {
        setScoreboard(sb);
        setKernel(k);
        setRecentQuotes(quotes.slice(-10).reverse());
      })
      .finally(() => setLoading(false));
  }, [selectedExecutive]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Executive Dashboard</h2>
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

      {!selectedExecutive && (
        <div className="text-center text-gray-500 py-12">
          Select an executive to view their voice system dashboard.
        </div>
      )}

      {selectedExecutive && loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      )}

      {selectedExecutive && !loading && scoreboard && (
        <>
          {/* Scoreboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <ScoreCard icon={Quote} label="Quotes" count={scoreboard.quotes} color="indigo" />
            <ScoreCard icon={BookOpen} label="Principles" count={scoreboard.principles} color="emerald" />
            <ScoreCard icon={Languages} label="Lexicon" count={scoreboard.lexicon} color="amber" />
            <ScoreCard icon={Shield} label="Stances" count={scoreboard.stances} color="rose" />
            <ScoreCard icon={BookMarked} label="Narratives" count={scoreboard.narratives} color="purple" />
            <ScoreCard icon={Brain} label="Kernel" count={scoreboard.has_kernel ? 1 : 0} color="cyan" />
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => onNavigate('quote-input')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> Add Quote
            </button>
            <button
              onClick={() => onNavigate('derivation')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Sparkles className="w-4 h-4" /> Derive Principles
            </button>
            <button
              onClick={() => onNavigate('draft-generator')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <FileText className="w-4 h-4" /> Generate Draft
            </button>
          </div>

          {/* Voice Kernel Summary */}
          {kernel && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Voice Kernel</h3>
                <button
                  onClick={() => openInObsidian(kernel.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Obsidian
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {kernel.body.slice(0, 800)}
                {kernel.body.length > 800 && (
                  <span className="text-gray-400">... (click Browse to see full kernel)</span>
                )}
              </div>
            </div>
          )}

          {/* Recent Quotes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Quotes ({recentQuotes.length})
            </h3>
            {recentQuotes.length === 0 ? (
              <p className="text-gray-500">No quotes yet. Add one to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentQuotes.map((q) => (
                  <div key={q.path} className="border-l-4 border-indigo-200 pl-4 py-2 flex items-center justify-between group">
                    <div>
                      <p className="font-medium text-gray-900">{q.filename}</p>
                      <p className="text-sm text-gray-500">
                        {String(q.frontmatter.source || '')} &middot;{' '}
                        {String(q.frontmatter.date_spoken || '')}
                      </p>
                    </div>
                    <button
                      onClick={() => openInObsidian(q.path)}
                      className="opacity-0 group-hover:opacity-100 text-purple-600 hover:text-purple-800 p-1"
                      title="Open in Obsidian"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ScoreCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || 'bg-gray-50 text-gray-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
