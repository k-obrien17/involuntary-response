import { useState, useRef } from 'react';
import { Sparkles, Save, Eye, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { VaultExecutive, VaultFile } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';

const DERIVATION_TYPES = [
  { value: 'principles', label: 'Principles', description: 'Recurring tone/structure patterns' },
  { value: 'lexicon', label: 'Lexicon', description: 'Signature phrases and vocabulary' },
  { value: 'stances', label: 'Stances', description: 'Core beliefs and positions' },
  { value: 'narratives', label: 'Narratives', description: 'Reusable stories and analogies' },
  { value: 'kernel', label: 'Voice Kernel', description: 'Full voice synthesis document' },
];

interface DerivationPanelProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  apiKey: string | null;
  onNavigateToSettings: () => void;
}

interface DerivationContext {
  system_prompt: string;
  quotes_text: string;
  all_derived: string;
}

export function DerivationPanel({
  executives,
  selectedExecutive,
  onSelectExecutive,
  apiKey,
  onNavigateToSettings,
}: DerivationPanelProps) {
  const [derivationType, setDerivationType] = useState('principles');
  const [result, setResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const streamedText = useRef('');

  if (!apiKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">API key required for AI derivation.</p>
        <button
          onClick={onNavigateToSettings}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Configure API Key
        </button>
      </div>
    );
  }

  const handleDerive = async () => {
    if (!selectedExecutive) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setSaved(false);
    streamedText.current = '';

    try {
      const context: DerivationContext = await invoke('get_derivation_context', {
        voicePath: selectedExecutive.voice_path,
        derivationType,
        speaker: selectedExecutive.name,
      });

      let userMessage = context.quotes_text;
      if (context.all_derived) {
        userMessage = context.all_derived + '\n\n---\n\nSource Quotes:\n\n' + context.quotes_text;
      }

      const unlistenChunk = await listen<{ text: string }>('claude-stream-chunk', (event) => {
        streamedText.current += event.payload.text;
        setResult(streamedText.current);
      });

      const unlistenDone = await listen('claude-stream-done', () => {
        setGenerating(false);
        unlistenChunk();
        unlistenDone();
        unlistenError();
      });

      const unlistenError = await listen<string>('claude-stream-error', (event) => {
        setError(event.payload);
        setGenerating(false);
        unlistenChunk();
        unlistenDone();
        unlistenError();
      });

      await api.generateWithClaudeStream(context.system_prompt, userMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedExecutive) return;
    setSaving(true);
    setError(null);

    try {
      let savedFile: VaultFile;

      if (derivationType === 'kernel') {
        savedFile = await invoke('write_derived_file', {
          voicePath: selectedExecutive.voice_path,
          fileType: 'voice-kernel',
          title: `Voice Kernel - ${selectedExecutive.name}`,
          frontmatterFields: {
            speaker: `"[[${selectedExecutive.name}]]"`,
            status: 'draft',
            version: 1,
          },
          body: result,
        });
      } else {
        const typeMap: Record<string, string> = {
          principles: 'voice-principle',
          lexicon: 'voice-lexicon',
          stances: 'voice-stance',
          narratives: 'voice-narrative',
        };

        savedFile = await invoke('write_derived_file', {
          voicePath: selectedExecutive.voice_path,
          fileType: typeMap[derivationType] || `voice-${derivationType.slice(0, -1)}`,
          title: `Derived ${derivationType}`,
          frontmatterFields: {
            speaker: `"[[${selectedExecutive.name}]]"`,
            status: 'draft',
            confidence: 'medium',
          },
          body: result,
        });
      }

      setSaved(true);
      setSavedPath(savedFile.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Derivation</h2>

      <div className="flex gap-4 mb-6">
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

        <select
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={derivationType}
          onChange={(e) => setDerivationType(e.target.value)}
        >
          {DERIVATION_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label} - {dt.description}
            </option>
          ))}
        </select>

        <button
          onClick={handleDerive}
          disabled={generating || !selectedExecutive}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? 'Deriving...' : 'Derive'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      {generating && !result && (
        <div className="flex items-center gap-3 py-8">
          <div className="animate-spin w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full" />
          <span className="text-gray-600">
            Analyzing quotes and deriving {derivationType}...
          </span>
        </div>
      )}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {generating ? 'Streaming...' : 'Preview'}
            </h3>
            <div className="flex gap-2">
              {!generating && (saved ? (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-sm">Saved</span>
                  {savedPath && (
                    <button
                      onClick={() => openInObsidian(savedPath)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Obsidian
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save to Vault'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 prose prose-sm max-w-none overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {result}
            {generating && <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5" />}
          </div>
        </div>
      )}
    </div>
  );
}
