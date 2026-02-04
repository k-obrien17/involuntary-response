import { useState, useRef, useEffect } from 'react';
import { Mic, Link, Save, ChevronDown, Loader2 } from 'lucide-react';
import { useExecutive } from '../contexts/ExecutiveContext';
import * as api from '../lib/api';
import type { VaultFile } from '../lib/types';

interface UnifiedCaptureProps {
  apiKey: string | null;
  onNavigateToSettings: () => void;
}

type ContentCategory = 'quote' | 'keyfact' | 'stance' | 'narrative';

interface CategorySuggestion {
  category: ContentCategory;
  confidence: number;
  title: string;
  source_hint: string;
}

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  quote: 'Quote',
  keyfact: 'Key Fact',
  stance: 'Stance',
  narrative: 'Narrative',
};

const CATEGORY_DESCRIPTIONS: Record<ContentCategory, string> = {
  quote: 'A direct statement or quote from the executive',
  keyfact: 'A biographical fact, achievement, or data point',
  stance: 'A position or opinion on a specific topic',
  narrative: 'A story or theme the executive uses',
};

export function UnifiedCapture({ apiKey, onNavigateToSettings }: UnifiedCaptureProps) {
  const { selectedExecutive } = useExecutive();
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ContentCategory | null>(null);
  const [title, setTitle] = useState('');
  const [showTypeOverride, setShowTypeOverride] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState<CategorySuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedFile, setSavedFile] = useState<VaultFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio recording state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // URL fetch state
  const [urlInput, setUrlInput] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Auto-detect content type when content changes
  useEffect(() => {
    if (!content.trim() || content.length < 20 || !apiKey) return;

    const detectTimeout = setTimeout(async () => {
      setAutoDetecting(true);
      try {
        const suggestion = await autoCategorize(content, apiKey);
        setAutoDetected(suggestion);
        if (!category) {
          setCategory(suggestion.category);
          setTitle(suggestion.title);
          if (suggestion.source_hint && !source) {
            setSource(suggestion.source_hint);
          }
        }
      } catch (err) {
        console.error('Auto-categorization failed:', err);
      } finally {
        setAutoDetecting(false);
      }
    }, 1000);

    return () => clearTimeout(detectTimeout);
  }, [content, apiKey]);

  async function autoCategorize(text: string, _key: string): Promise<CategorySuggestion> {
    const systemPrompt = `You are a content categorizer for an executive voice management system.
Analyze the provided content and categorize it as one of:
- quote: A direct statement, verbatim quote, or speaking sample from the executive
- keyfact: A biographical fact, career milestone, achievement, or concrete data point about the executive
- stance: A position, opinion, or viewpoint the executive holds on a specific topic or issue
- narrative: A recurring story, theme, or framework the executive uses to explain their worldview

Respond with JSON only:
{
  "category": "quote" | "keyfact" | "stance" | "narrative",
  "confidence": 0.0-1.0,
  "title": "brief descriptive title (3-7 words)",
  "source_hint": "detected source if any (e.g., 'LinkedIn', 'earnings call', '')"
}`;

    const response = await api.generateWithClaude(systemPrompt, text, 500);
    try {
      return JSON.parse(response);
    } catch {
      return { category: 'quote', confidence: 0.5, title: 'Untitled', source_hint: '' };
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      const intents = await api.transcribeAndParse(bytes, [selectedExecutive?.name || '']);
      // For now, just use the transcript as content
      if (intents.length > 0) {
        setContent(intents[0].topic + (intents[0].notes ? '\n\n' + intents[0].notes : ''));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    }
  };

  const fetchUrl = async () => {
    if (!urlInput.trim()) return;
    setFetchingUrl(true);
    setError(null);
    try {
      // For now, just set the URL as source - in future could fetch and extract
      setSource(urlInput);
      setUrlInput('');
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleSave = async () => {
    if (!selectedExecutive || !content.trim() || !category) return;

    setSaving(true);
    setError(null);

    try {
      let file: VaultFile;
      const finalTitle = title || `${CATEGORY_LABELS[category]} - ${new Date().toLocaleDateString()}`;

      switch (category) {
        case 'quote':
          file = await api.createQuote(selectedExecutive.voice_path, selectedExecutive.name, {
            organizing_question: '',
            verbatim_quote: content,
            source: source || 'unknown',
            source_type: detectSourceType(source),
            date_spoken: date,
            title: finalTitle,
            topics: [],
            confidence: 'medium',
          });
          break;

        case 'keyfact':
          file = await api.createKeyfact(selectedExecutive.voice_path, selectedExecutive.name, {
            title: finalTitle,
            fact_category: 'achievement',
            fact_value: content,
            source: source || '',
            context: '',
          });
          break;

        case 'stance':
        case 'narrative':
          // Use derived file writer for stances and narratives
          file = await api.writeDerivedFile(
            selectedExecutive.voice_path,
            category === 'stance' ? 'voice-stance' : 'voice-narrative',
            finalTitle,
            {
              speaker: `"[[${selectedExecutive.name}]]"`,
              source: source || '',
              date_captured: date,
            },
            `# ${finalTitle}\n\n${content}`
          );
          break;

        default:
          throw new Error('Invalid category');
      }

      setSavedFile(file);
      setSaved(true);
      setContent('');
      setTitle('');
      setSource('');
      setCategory(null);
      setAutoDetected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  function detectSourceType(src: string): string {
    const lower = src.toLowerCase();
    if (lower.includes('linkedin')) return 'linkedin';
    if (lower.includes('podcast')) return 'podcast';
    if (lower.includes('interview')) return 'interview';
    if (lower.includes('earnings') || lower.includes('call')) return 'earnings-call';
    if (lower.includes('article') || lower.includes('blog')) return 'article';
    return 'other';
  }

  if (!apiKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">API key required for auto-categorization.</p>
        <button
          onClick={onNavigateToSettings}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Configure API Key
        </button>
      </div>
    );
  }

  if (!selectedExecutive) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select an executive from the sidebar to add content.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Add to {selectedExecutive.name}'s Voice
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Paste any content — quotes, facts, positions, or stories. We'll help categorize it.
        </p>

        {/* Main textarea */}
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setSaved(false);
            }}
            placeholder="Paste a quote, fact, stance, or story..."
            className="w-full h-48 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />

          {/* Action buttons row */}
          <div className="flex items-center gap-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                recording
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Mic className={`w-4 h-4 ${recording ? 'animate-pulse' : ''}`} />
              {recording ? 'Stop' : 'Record'}
            </button>

            {audioBlob && !recording && (
              <button
                onClick={transcribeAudio}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 text-sm"
              >
                Transcribe Recording
              </button>
            )}

            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste a URL..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={fetchUrl}
                disabled={fetchingUrl || !urlInput.trim()}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                <Link className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto-detection feedback */}
          {autoDetecting && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing content...
            </div>
          )}

          {autoDetected && !autoDetecting && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm text-indigo-700">
                Detected: <span className="font-medium">{CATEGORY_LABELS[autoDetected.category]}</span>
                {autoDetected.confidence >= 0.8 && ' (high confidence)'}
              </p>
              {autoDetected.source_hint && (
                <p className="text-xs text-indigo-600 mt-1">
                  Source appears to be: {autoDetected.source_hint}
                </p>
              )}
            </div>
          )}

          {/* Metadata fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="LinkedIn, interview, etc..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
                <button
                  onClick={() => setShowTypeOverride(!showTypeOverride)}
                  className="ml-2 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {showTypeOverride ? 'Hide' : 'Override'}
                  <ChevronDown className="w-3 h-3 inline ml-0.5" />
                </button>
              </label>
              {showTypeOverride ? (
                <select
                  value={category || ''}
                  onChange={(e) => setCategory(e.target.value as ContentCategory)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select type...</option>
                  {(Object.keys(CATEGORY_LABELS) as ContentCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                  {category ? (
                    <>
                      {CATEGORY_LABELS[category]}
                      <span className="text-gray-400 ml-2">
                        ({CATEGORY_DESCRIPTIONS[category]})
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">Auto-detecting...</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {saved && savedFile && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Saved to vault: {savedFile.filename}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !content.trim() || !category}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save to Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
