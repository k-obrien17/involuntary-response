function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function EmbedPreview({ embed }) {
  if (!embed) return null;

  // Link card (article / generic URL)
  if (embed.provider === 'link') {
    const href = embed.originalUrl || embed.embedUrl;
    const site = hostnameOf(href);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-gray-400 dark:hover:border-gray-500 transition"
      >
        {embed.thumbnailUrl && (
          <div className="aspect-[1.91/1] bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <img
              src={embed.thumbnailUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {site}
          </div>
          <div className="mt-1 text-base font-medium text-gray-900 dark:text-gray-100 leading-snug">
            {embed.title || href}
          </div>
        </div>
      </a>
    );
  }

  // Primary path: server-resolved oEmbed HTML (sanitized server-side to iframe-only)
  if (embed.embedHtml) {
    const iframeOnly = embed.embedHtml.match(/<iframe\s[^>]*><\/iframe>/i)?.[0];
    if (!iframeOnly) {
      return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-500 dark:text-gray-400">
          Embed could not be displayed.{' '}
          {embed.originalUrl && (
            <a href={embed.originalUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Open link
            </a>
          )}
        </div>
      );
    }

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
