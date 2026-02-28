import { useState } from 'react';
import EmbedPreview from './EmbedPreview';

function getEmbedHeight(embed) {
  if (embed.provider === 'spotify') return embed.embedType === 'track' ? 152 : 352;
  if (embed.provider === 'apple') return embed.embedType === 'song' ? 175 : 450;
  return 152;
}

export default function EmbedPlaceholder({ embed }) {
  const [loaded, setLoaded] = useState(false);

  if (!embed) return null;

  if (loaded) {
    return <EmbedPreview embed={embed} />;
  }

  const providerLabels = { spotify: 'Spotify', apple: 'Apple Music', youtube: 'YouTube', vimeo: 'Vimeo', soundcloud: 'SoundCloud', bandcamp: 'Bandcamp' };
  const providerLabel = providerLabels[embed.provider] || embed.provider;
  const title = embed.title || `Listen on ${providerLabel}`;
  const height = getEmbedHeight(embed);

  return (
    <button
      onClick={() => setLoaded(true)}
      style={{ minHeight: height }}
      className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200
                 bg-gray-50 hover:bg-gray-100 transition text-left group"
      aria-label={`Load ${providerLabel} player: ${title}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200
                      flex items-center justify-center text-gray-500 group-hover:text-gray-700">
        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4 2l10 6-10 6V2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{providerLabel}</p>
      </div>
    </button>
  );
}
