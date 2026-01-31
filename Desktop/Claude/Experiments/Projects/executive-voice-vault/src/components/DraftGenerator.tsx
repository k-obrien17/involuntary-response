import { useState, useEffect, useRef } from 'react';
import { FileText, Copy, Check, Save, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { VaultExecutive, VaultFile } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';
import { DraftFeedback } from './DraftFeedback';

interface DraftGeneratorProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  apiKey: string | null;
  onNavigateToSettings: () => void;
}

export function DraftGenerator({
  executives,
  selectedExecutive,
  onSelectExecutive,
  apiKey,
  onNavigateToSettings,
}: DraftGeneratorProps) {
  const [format, setFormat] = useState('talking-points');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [kernel, setKernel] = useState<VaultFile | null>(null);
  const streamedText = useRef('');

  useEffect(() => {
    if (!selectedExecutive) return;
    api.getVoiceKernel(selectedExecutive.voice_path).then(setKernel);
  }, [selectedExecutive]);

  if (!apiKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">API key required for draft generation.</p>
        <button
          onClick={onNavigateToSettings}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Configure API Key
        </button>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!selectedExecutive || !topic) return;
    setGenerating(true);
    setError(null);
    setDraft(null);
    setSaved(false);
    streamedText.current = '';

    try {
      const quotes = await api.listQuotes(selectedExecutive.voice_path);
      const lexicon = await api.listVoiceFiles(selectedExecutive.voice_path, 'voice-lexicon');

      let context = '';
      if (kernel) {
        context += '=== VOICE KERNEL ===\n' + kernel.body + '\n\n';
      }

      if (lexicon.length > 0) {
        context += '=== KEY LEXICON ===\n';
        for (const l of lexicon.slice(0, 15)) {
          context += `- ${l.filename}: ${l.body.slice(0, 200)}\n`;
        }
        context += '\n';
      }

      const relevantQuotes = quotes.slice(-20);
      if (relevantQuotes.length > 0) {
        context += '=== VOICE QUOTES ===\n';
        for (const q of relevantQuotes) {
          context += `[${q.frontmatter.id}] ${q.body.slice(0, 300)}\n---\n`;
        }
      }

      const systemPrompt = `You are a voice-aware ghostwriter. You have access to a Voice Kernel (master voice reference), lexicon entries, and verbatim quotes for ${selectedExecutive.name}.

Draft content that authentically captures their voice. Follow the voice kernel's tone sliders, use their actual lexicon, and mirror their cadence patterns.

Rules:
- Use their signature phrases naturally (from lexicon)
- Follow their do/don't patterns (from kernel)
- Match their sentence structure and rhythm
- Never use phrases from their taboo list
- Stay in their voice — do not add generic corporate language they wouldn't use`;

      const userMessage = `${context}

---

BRIEF:
- Format: ${format}
- Topic: ${topic}
- Audience: ${audience || 'General'}
- Goal: ${goal || 'Inform and persuade'}
${additionalNotes ? `- Additional notes: ${additionalNotes}` : ''}

Please draft this content in ${selectedExecutive.name}'s voice.`;

      const unlistenChunk = await listen<{ text: string }>('claude-stream-chunk', (event) => {
        streamedText.current += event.payload.text;
        setDraft(streamedText.current);
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

      await api.generateWithClaudeStream(systemPrompt, userMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (draft) {
      navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!draft || !selectedExecutive) return;
    try {
      const savedFile: VaultFile = await invoke('write_derived_file', {
        voicePath: selectedExecutive.voice_path,
        fileType: 'voice-quote',
        title: `Draft - ${topic.slice(0, 50)}`,
        frontmatterFields: {
          speaker: `"[[${selectedExecutive.name}]]"`,
          status: 'draft',
          draft_format: format,
          draft_topic: topic,
          draft_audience: audience,
        },
        body: draft,
      });
      setSaved(true);
      setSavedPath(savedFile.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const FORMATS = [
    'talking-points',
    'op-ed',
    'memo',
    'email',
    'social-post',
    'speech-excerpt',
    'press-release',
    'blog-post',
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Voice-Aware Draft Generator</h2>

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

      {selectedExecutive && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Investors, media, employees..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should the draft be about?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this accomplish?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Key quotes to feature, specific data points, etc."
            />
          </div>

          {kernel && (
            <div className="text-sm text-emerald-600">
              Voice Kernel loaded for {selectedExecutive.name}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !topic}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate Draft'}
          </button>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}

          {generating && !draft && (
            <div className="flex items-center gap-3 py-4">
              <div className="animate-spin w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full" />
              <span className="text-gray-600">Generating voice-aware draft...</span>
            </div>
          )}

          {draft && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {generating ? 'Streaming...' : 'Draft Output'}
                </h3>
                <div className="flex gap-2">
                  {!generating && (
                    <>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      {saved ? (
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
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          <Save className="w-4 h-4" /> Save to Vault
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 prose prose-sm max-w-none overflow-auto max-h-[60vh] whitespace-pre-wrap">
                {draft}
                {generating && <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5" />}
              </div>

              {!generating && selectedExecutive && (
                <DraftFeedback
                  voicePath={selectedExecutive.voice_path}
                  speaker={selectedExecutive.name}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
