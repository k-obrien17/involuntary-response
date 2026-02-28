const SPOTIFY_RE = /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+/g;
const APPLE_MUSIC_RE = /https?:\/\/music\.apple\.com\/[a-z]{2}\/(album|playlist|song)\/[^/\s]+\/[0-9]+(\?i=[0-9]+)?/g;
const MUSIC_URL_RE = new RegExp(
  `(${SPOTIFY_RE.source}|${APPLE_MUSIC_RE.source})`,
  'g'
);

function detectProvider(url) {
  if (url.includes('open.spotify.com')) return 'Spotify';
  if (url.includes('music.apple.com')) return 'Apple Music';
  return 'Music';
}

function detectType(url) {
  if (/\/(track|song)\//.test(url)) return 'track';
  if (/\/album\//.test(url)) return 'album';
  if (/\/playlist\//.test(url)) return 'playlist';
  return 'link';
}

function MusicNoteIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function parseText(text) {
  const parts = [];
  let lastIndex = 0;
  const re = new RegExp(MUSIC_URL_RE.source, 'g');
  for (const match of text.matchAll(re)) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'link',
      url: match[0],
      provider: detectProvider(match[0]),
      mediaType: detectType(match[0]),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}

export default function RichBody({ text, className }) {
  if (!text) return null;

  const parts = parseText(text);

  return (
    <p className={`whitespace-pre-wrap ${className || ''}`}>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-current no-underline border-b border-gray-400 dark:border-gray-500 hover:border-gray-900 dark:hover:border-gray-200 transition"
          >
            <MusicNoteIcon />
            <span>
              {part.provider} {part.mediaType}
            </span>
          </a>
        )
      )}
    </p>
  );
}
