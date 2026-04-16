export default function EmbedPreview({ embed }) {
  if (!embed) return null;

  // Primary path: server-resolved oEmbed HTML (sanitized server-side to iframe-only)
  if (embed.embedHtml) {
    const iframeOnly = embed.embedHtml.match(/<iframe\s[^>]*><\/iframe>/i)?.[0];
    if (!iframeOnly) return null;

    // Extract allowed attributes into an object — render via React, never innerHTML
    const allowed = ['src', 'width', 'height', 'allow', 'sandbox'];
    const props = {};
    for (const [, name, value] of iframeOnly.matchAll(/(\w+)="([^"]*)"/g)) {
      if (allowed.includes(name)) props[name] = value;
    }
    if (!props.src) return null;

    // Video providers (youtube, vimeo) return small fixed dimensions — use aspect ratio so
    // the iframe scales with container width without collapsing vertically.
    const w = parseInt(props.width, 10);
    const h = parseInt(props.height, 10);
    const isVideo = embed.provider === 'youtube' || embed.provider === 'vimeo';
    const useAspect = isVideo && w > 0 && h > 0;

    return (
      <div
        className="rounded-lg overflow-hidden max-w-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:max-w-full"
        style={useAspect ? { aspectRatio: `${w} / ${h}` } : undefined}
      >
        <iframe
          src={props.src}
          width={useAspect ? undefined : (props.width || '100%')}
          height={useAspect ? undefined : (props.height || 352)}
          allow={props.allow}
          sandbox={props.sandbox}
          frameBorder="0"
          loading="lazy"
          title={embed.title || `${embed.provider || 'Music'} embed`}
        />
      </div>
    );
  }

  // Legacy fallback for old DB rows without embed_html
  if (embed.provider === 'spotify') {
    return (
      <div className="rounded-lg overflow-hidden max-w-full [&>iframe]:max-w-full">
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
      <div className="rounded-lg overflow-hidden max-w-full [&>iframe]:max-w-full">
        <iframe
          src={embed.embedUrl}
          width="100%"
          height={embed.embedType === 'song' ? 175 : 450}
          frameBorder="0"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *"
          style={{ maxWidth: '660px' }}
          className="max-w-full"
          loading="lazy"
          title={embed.title || 'Apple Music embed'}
        />
      </div>
    );
  }

  return null;
}
