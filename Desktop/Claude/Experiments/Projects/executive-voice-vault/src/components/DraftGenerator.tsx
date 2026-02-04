import { useState, useEffect, useRef } from 'react';
import { FileText, Copy, Check, Save, ExternalLink } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import type { VaultExecutive, VaultFile } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';
import { DraftFeedback } from './DraftFeedback';
import { LinkedInPreview } from './LinkedInPreview';

interface DraftGeneratorProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  apiKey: string | null;
  onNavigateToSettings: () => void;
  prefill?: { topic: string; format?: string; articleText?: string; notes?: string } | null;
  onClearPrefill?: () => void;
}

type DraftStatus = 'draft' | 'pending_review' | 'approved' | 'published';

const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  published: 'Published',
};

const DRAFT_STATUS_COLORS: Record<DraftStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
};

export function DraftGenerator({
  // executives and onSelectExecutive kept for API compatibility but not used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  executives: _executives,
  selectedExecutive,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSelectExecutive: _onSelectExecutive,
  apiKey,
  onNavigateToSettings,
  prefill,
  onClearPrefill,
}: DraftGeneratorProps) {
  const [format, setFormat] = useState('social-post');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [articleText, setArticleText] = useState('');
  const [authorship, setAuthorship] = useState<'commenting' | 'authored'>('commenting');
  const [draft, setDraft] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('draft');
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

  useEffect(() => {
    if (!prefill) return;
    setTopic(prefill.topic);
    if (prefill.format) {
      setFormat(prefill.format);
    }
    if (prefill.articleText) {
      setArticleText(prefill.articleText);
    }
    if (prefill.notes) {
      setAdditionalNotes(prefill.notes);
    }
    onClearPrefill?.();
  }, [prefill]);

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

  const isLinkedIn = format === 'social-post';

  const handleGenerate = async () => {
    if (!selectedExecutive || !topic) return;
    setGenerating(true);
    setError(null);
    setDraft(null);
    setSaved(false);
    setDraftStatus('draft');
    streamedText.current = '';

    try {
      const [quotes, lexicon, antiVoice, keyfacts] = await Promise.all([
        api.listQuotes(selectedExecutive.voice_path),
        api.listVoiceFiles(selectedExecutive.voice_path, 'voice-lexicon'),
        api.getAntiVoiceContext(selectedExecutive.voice_path),
        api.listKeyfacts(selectedExecutive.voice_path),
      ]);

      let context = '';
      if (kernel) {
        context += '=== VOICE KERNEL ===\n' + kernel.body + '\n\n';
      }

      if (keyfacts.length > 0) {
        context += '=== KEY FACTS ===\n';
        context += 'Important facts about this executive that may be relevant to mention:\n';
        for (const kf of keyfacts) {
          const category = kf.frontmatter.fact_category as string || '';
          const value = kf.frontmatter.fact_value as string || '';
          context += `- [${category}] ${value}\n`;
        }
        context += '\n';
      }

      if (lexicon.length > 0) {
        context += '=== KEY LEXICON ===\n';
        for (const l of lexicon.slice(0, 15)) {
          context += `- ${l.filename}: ${l.body.slice(0, 200)}\n`;
        }
        context += '\n';
      }

      if (antiVoice) {
        context += antiVoice + '\n\n';
      }

      const relevantQuotes = quotes.slice(-20);
      if (relevantQuotes.length > 0) {
        context += '=== VOICE QUOTES ===\n';
        for (const q of relevantQuotes) {
          context += `[${q.frontmatter.id}] ${q.body.slice(0, 300)}\n---\n`;
        }
      }

      let systemPrompt = `You are a ghostwriter for ${selectedExecutive.name}. Write content in their authentic voice.

CRITICAL: Output ONLY the finished post/content. No explanations, no "here's the post", no voice analysis, no metadata. Just the clean, ready-to-publish text.

Voice Guidelines (use but don't mention):
- Match their natural speaking style and word choices
- Use their typical sentence structure and rhythm
- Avoid phrases they wouldn't use
- Stay authentic — no generic corporate language`;

      // LinkedIn-specific prompt additions
      if (isLinkedIn) {
        systemPrompt += `

FORMAT: LinkedIn Post
- Under 3,000 characters
- Strong hook in the first line
- Short paragraphs with blank lines between
- End with a question or call-to-action
- 2-3 hashtags at the end`;

        if (authorship === 'authored' && articleText.trim()) {
          systemPrompt += `
- Frame as sharing their own work ("I wrote about...", "In my latest piece...")`;
        } else if (articleText.trim()) {
          systemPrompt += `
- Frame as commentary on the referenced content`;
        }
      }

      let userMessage = `VOICE CONTEXT:\n${context}\n\n---\n\nWrite a ${format} about: ${topic}`;

      if (audience) {
        userMessage += `\nAudience: ${audience}`;
      }
      if (goal) {
        userMessage += `\nGoal: ${goal}`;
      }
      if (articleText.trim()) {
        userMessage += `\n\nReference material:\n${articleText}`;
      }
      if (additionalNotes) {
        userMessage += `\n\nNotes: ${additionalNotes}`;
      }

      userMessage += `\n\nWrite the ${format} now. Output only the finished text, nothing else.`;

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
      const savedFile = await api.writeDerivedFile(
        selectedExecutive.voice_path,
        'voice-draft',
        `Draft - ${topic.slice(0, 50)}`,
        {
          speaker: `"[[${selectedExecutive.name}]]"`,
          status: draftStatus,
          draft_format: format,
          draft_topic: topic,
          draft_audience: audience,
          ...(articleText.trim() ? { reference_article: true, authorship } : {}),
        },
        draft,
      );
      setSaved(true);
      setSavedPath(savedFile.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

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

  if (!selectedExecutive) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Write</h2>
        <p className="text-gray-500">Select an executive from the sidebar to start writing.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Write for {selectedExecutive.name}</h2>
      {kernel && (
        <p className="text-sm text-emerald-600 mb-6">Voice Kernel loaded</p>
      )}
      {!kernel && (
        <p className="text-sm text-amber-600 mb-6">No Voice Kernel yet — generate one from the Library for better results</p>
      )}

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

          {/* Article/reference text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Article or Text (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px] font-mono text-sm"
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
              placeholder="Paste the article, post, or text being referenced..."
            />
            {articleText.trim() && (
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authorship"
                    value="commenting"
                    checked={authorship === 'commenting'}
                    onChange={() => setAuthorship('commenting')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Commenting on this</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="authorship"
                    value="authored"
                    checked={authorship === 'authored'}
                    onChange={() => setAuthorship('authored')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Wrote this</span>
                </label>
              </div>
            )}
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
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {generating ? 'Streaming...' : 'Draft Output'}
                  </h3>
                  {!generating && (
                    <select
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value as DraftStatus)}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${DRAFT_STATUS_COLORS[draftStatus]}`}
                    >
                      {Object.entries(DRAFT_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
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

              {/* LinkedIn post-processor */}
              {!generating && isLinkedIn && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">LinkedIn Post Check</h4>
                  <LinkedInPreview text={draft} />
                </div>
              )}

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
