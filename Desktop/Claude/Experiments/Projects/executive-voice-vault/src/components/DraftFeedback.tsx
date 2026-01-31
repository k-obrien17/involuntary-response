import { useState } from 'react';
import { MessageSquare, Save, Check } from 'lucide-react';
import * as api from '../lib/api';

interface DraftFeedbackProps {
  voicePath: string;
  speaker: string;
}

export function DraftFeedback({ voicePath, speaker }: DraftFeedbackProps) {
  const [feedback, setFeedback] = useState('');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const summaryText = summary.trim() || feedback.slice(0, 60).replace(/\n/g, ' ');
      await api.createAntiVoice(voicePath, speaker, feedback, summaryText);
      setSaved(true);
      setFeedback('');
      setSummary('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-6">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4" />
        What would you change?
      </h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px] text-sm"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="This doesn't sound like them because... They would never say... The tone should be more..."
        />
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Short summary (optional, e.g. 'Too formal, needs casual tone')"
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={saving || !feedback.trim()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Saved to Anti-Voice
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save as Anti-Voice'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
