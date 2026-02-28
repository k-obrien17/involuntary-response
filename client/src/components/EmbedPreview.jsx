export default function EmbedPreview({ embed }) {
  if (!embed) return null;

  // Primary path: server-resolved oEmbed HTML (sanitized server-side to iframe-only)
  if (embed.embedHtml) {
    // Defense-in-depth: strip anything that isn't an iframe tag
    const iframeOnly = embed.embedHtml.match(/<iframe\s[^>]*><\/iframe>/i)?.[0];
    if (!iframeOnly) return null;

    return (
      <div
        className="rounded-lg overflow-hidden [&>iframe]:w-full"
        dangerouslySetInnerHTML={{ __html: iframeOnly }}
      />
    );
  }

  // Legacy fallback for old DB rows without embed_html
  if (embed.provider === 'spotify') {
    return (
      <div className="rounded-lg overflow-hidden">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height={embed.embedType === 'track' ? 152 : 352}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={embed.title || 'Spotify embed'}
        />
      </div>
    );
  }

  if (embed.provider === 'apple') {
    return (
      <div className="rounded-lg overflow-hidden">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height={embed.embedType === 'song' ? 175 : 450}
          frameBorder="0"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *"
          style={{ maxWidth: '660px' }}
          loading="lazy"
          title={embed.title || 'Apple Music embed'}
        />
      </div>
    );
  }

  return null;
}
