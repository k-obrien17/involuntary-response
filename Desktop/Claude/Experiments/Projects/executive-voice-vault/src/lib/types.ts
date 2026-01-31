// --- Vault types ---

export interface Frontmatter {
  [key: string]: unknown;
}

export interface VaultFile {
  path: string;
  filename: string;
  frontmatter: Frontmatter;
  body: string;
}

export interface VaultExecutive {
  name: string;
  voice_path: string;
  contact_path: string;
}

export interface VoiceScoreboard {
  quotes: number;
  principles: number;
  lexicon: number;
  stances: number;
  narratives: number;
  antivoice: number;
  has_kernel: boolean;
}

export interface CreateQuoteInput {
  organizing_question: string;
  verbatim_quote: string;
  source: string;
  source_type: string;
  date_spoken: string;
  title: string;
  topics: string[];
  confidence: string;
}

export type VoiceFileType =
  | 'voice-quote'
  | 'voice-principle'
  | 'voice-lexicon'
  | 'voice-stance'
  | 'voice-narrative'
  | 'voice-kernel'
  | 'voice-index'
  | 'voice-antivoice';

export const VOICE_FILE_TYPE_LABELS: Record<VoiceFileType, string> = {
  'voice-quote': 'Quotes',
  'voice-principle': 'Principles',
  'voice-lexicon': 'Lexicon',
  'voice-stance': 'Stances',
  'voice-narrative': 'Narratives',
  'voice-kernel': 'Kernel',
  'voice-index': 'Index',
  'voice-antivoice': 'Anti-Voice',
};

export const VOICE_SOURCE_TYPES = [
  'interview',
  'article',
  'podcast',
  'presentation',
  'earnings-call',
  'other',
];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
