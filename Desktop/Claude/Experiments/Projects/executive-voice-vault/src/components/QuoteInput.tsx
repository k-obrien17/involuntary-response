import { useState, useRef } from 'react';
import { Plus, Check, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import type { VaultExecutive, CreateQuoteInput, VaultFile } from '../lib/types';
import { VOICE_SOURCE_TYPES } from '../lib/types';
import { openInObsidian } from '../lib/obsidian';
import * as api from '../lib/api';

interface QuoteInputProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
  onSubmit: (voicePath: string, speaker: string, input: CreateQuoteInput) => Promise<VaultFile>;
  apiKey?: string | null;
}

interface ExtractedQuote {
  title: string;
  organizing_question: string;
  verbatim_quote: string;
  topics: string[];
  confidence: string;
  selected: boolean;
}

export function QuoteInput({
  executives,
  selectedExecutive,
  onSelectExecutive,
  onSubmit,
  apiKey,
}: QuoteInputProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Voice Quotes</h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              mode === 'single' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Single Quote
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              mode === 'bulk' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Bulk Ingest
          </button>
        </div>
      </div>

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

      {selectedExecutive && mode === 'single' && (
        <SingleQuoteForm
          selectedExecutive={selectedExecutive}
          onSubmit={onSubmit}
        />
      )}

      {selectedExecutive && mode === 'bulk' && (
        <BulkIngestForm
          selectedExecutive={selectedExecutive}
          onSubmit={onSubmit}
          apiKey={apiKey}
        />
      )}
    </div>
  );
}

function SingleQuoteForm({
  selectedExecutive,
  onSubmit,
}: {
  selectedExecutive: VaultExecutive;
  onSubmit: (voicePath: string, speaker: string, input: CreateQuoteInput) => Promise<VaultFile>;
}) {
  const [title, setTitle] = useState('');
  const [organizingQuestion, setOrganizingQuestion] = useState('');
  const [verbatimQuote, setVerbatimQuote] = useState('');
  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState('linkedin');
  const [dateSpoken, setDateSpoken] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastCreatedPath, setLastCreatedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        confidence: 'high',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Organizing Question</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Source / Publication</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Topics (comma-separated)</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={topicsText}
          onChange={(e) => setTopicsText(e.target.value)}
          placeholder="technology, competitive-advantage, culture"
        />
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
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
  );
}

function BulkIngestForm({
  selectedExecutive,
  onSubmit,
  apiKey,
}: {
  selectedExecutive: VaultExecutive;
  onSubmit: (voicePath: string, speaker: string, input: CreateQuoteInput) => Promise<VaultFile>;
  apiKey?: string | null;
}) {
  const [transcript, setTranscript] = useState('');
  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState('interview');
  const [dateSpoken, setDateSpoken] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamedText = useRef('');

  if (!apiKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">API key required for bulk quote extraction.</p>
        <p className="text-sm text-gray-400">Configure it in Settings.</p>
      </div>
    );
  }

  const handleExtract = async () => {
    if (!transcript.trim()) return;
    setExtracting(true);
    setError(null);
    setExtracted([]);
    streamedText.current = '';

    const systemPrompt = `You are a voice quote extraction expert. Extract distinct, quotable passages from the following transcript/text by ${selectedExecutive.name}.

For each quote, output a JSON object on its own line in this exact format:
{"title":"short title","organizing_question":"the question or topic this addresses","verbatim_quote":"the exact quote text","topics":["topic1","topic2"],"confidence":"high"}

Rules:
- Extract ONLY verbatim passages — do not paraphrase or clean up
- Each quote should be a self-contained, meaningful statement (not fragments)
- Title should be 3-8 words summarizing the quote's point
- Organizing question should capture what topic/question the quote addresses
- Topics should be 1-3 relevant tags
- Confidence: "high" for clearly attributable quotes, "medium" if context is ambiguous
- Output ONLY the JSON lines, no other text, no markdown fences
- Aim for quality over quantity — skip filler and small talk`;

    const userMessage = `Source: ${source || 'Unknown'}\nDate: ${dateSpoken || 'Unknown'}\nSpeaker: ${selectedExecutive.name}\n\n---\n\n${transcript}`;

    try {
      const unlistenChunk = await listen<{ text: string }>('claude-stream-chunk', (event) => {
        streamedText.current += event.payload.text;
      });

      const unlistenDone = await listen('claude-stream-done', () => {
        parseExtracted(streamedText.current);
        setExtracting(false);
        unlistenChunk();
        unlistenDone();
        unlistenError();
      });

      const unlistenError = await listen<string>('claude-stream-error', (event) => {
        setError(event.payload);
        setExtracting(false);
        unlistenChunk();
        unlistenDone();
        unlistenError();
      });

      await api.generateWithClaudeStream(systemPrompt, userMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setExtracting(false);
    }
  };

  const parseExtracted = (text: string) => {
    const quotes: ExtractedQuote[] = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.verbatim_quote) {
          quotes.push({ ...parsed, selected: true });
        }
      } catch {
        // skip non-JSON lines
      }
    }
    setExtracted(quotes);
  };

  const toggleQuote = (idx: number) => {
    setExtracted((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, selected: !q.selected } : q)),
    );
  };

  const removeQuote = (idx: number) => {
    setExtracted((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAll = async () => {
    const toSave = extracted.filter((q) => q.selected);
    if (toSave.length === 0) return;
    setSaving(true);
    setError(null);
    setSavedCount(0);

    let count = 0;
    for (const q of toSave) {
      try {
        await onSubmit(selectedExecutive.voice_path, selectedExecutive.name, {
          title: q.title,
          organizing_question: q.organizing_question,
          verbatim_quote: q.verbatim_quote,
          source: source || 'Bulk ingest',
          source_type: sourceType,
          date_spoken: dateSpoken,
          topics: q.topics || [],
          confidence: q.confidence || 'medium',
        });
        count++;
        setSavedCount(count);
      } catch (err) {
        setError(`Failed on quote ${count + 1}: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }

    if (count === toSave.length) {
      setExtracted([]);
      setTranscript('');
    }
    setSaving(false);
  };

  const selectedCount = extracted.filter((q) => q.selected).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Podcast Episode 42"
          />
        </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={dateSpoken}
            onChange={(e) => setDateSpoken(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transcript / Article Text
        </label>
        <textarea
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[200px] font-mono text-sm"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the full transcript, article, or interview text here..."
        />
      </div>

      <button
        onClick={handleExtract}
        disabled={extracting || !transcript.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        <FileText className="w-4 h-4" />
        {extracting ? 'Extracting quotes...' : 'Extract Quotes'}
      </button>

      {extracting && (
        <div className="flex items-center gap-3 py-4">
          <div className="animate-spin w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full" />
          <span className="text-gray-600">Reading transcript and extracting quotable passages...</span>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {extracted.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Extracted Quotes ({selectedCount}/{extracted.length} selected)
            </h3>
            <button
              onClick={handleSaveAll}
              disabled={saving || selectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? `Saving ${savedCount}/${selectedCount}...` : `Save ${selectedCount} Quotes`}
            </button>
          </div>

          <div className="space-y-3">
            {extracted.map((q, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-lg shadow p-4 border-l-4 transition-colors ${
                  q.selected ? 'border-indigo-500' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={() => toggleQuote(idx)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-gray-900 text-sm">{q.title}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{q.organizing_question}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                      {q.verbatim_quote}
                    </p>
                    {q.topics && q.topics.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {q.topics.map((tag) => (
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
                  <button
                    onClick={() => removeQuote(idx)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {savedCount > 0 && extracted.length === 0 && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {savedCount} quotes saved to vault
        </div>
      )}
    </div>
  );
}
