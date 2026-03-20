export default function EmbedPreview({ embed }) {
  if (!embed) return null;

  // Primary path: server-resolved oEmbed HTML (sanitized server-side to iframe-only)
  if (embed.embedHtml) {
    // Defense-in-depth: strip anything that isn't an iframe tag
    const iframeOnly = embed.embedHtml.match(/<iframe\s[^>]*><\/iframe>/i)?.[0];
    if (!iframeOnly) return null;

    const allowed = ['src', 'width', 'height', 'allow', 'sandbox'];
    const attrs = [...iframeOnly.matchAll(/(\w+)="([^"]*)"/g)]
      .filter(([, name]) => allowed.includes(name))
      .map(([, name, value]) => `${name}="${value}"`)
      .join(' ');
    const safeIframe = `<iframe ${attrs}></iframe>`;

    return (
      <div
        className="rounded-lg overflow-hidden max-w-full [&>iframe]:w-full [&>iframe]:max-w-full"
        dangerouslySetInnerHTML={{ __html: safeIframe }}
      />
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
