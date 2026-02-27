/**
 * Parse Spotify and Apple Music URLs into embed data.
 *
 * @param {string} url - A Spotify or Apple Music URL
 * @returns {{ provider: string, type: string, id: string, embedUrl: string, originalUrl: string } | null}
 */
export function parseEmbedUrl(url) {
  if (!url) return null;

  // Spotify: track, album, or playlist
  const spotifyMatch = url.match(
    /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/
  );
  if (spotifyMatch) {
    const [, type, id] = spotifyMatch;
    return {
      provider: 'spotify',
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
      originalUrl: url,
    };
  }

  // Apple Music: album, playlist, or song (with optional ?i= for individual song)
  const appleMatch = url.match(
    /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/([0-9]+)(\?i=([0-9]+))?/
  );
  if (appleMatch) {
    const [, region, rawType, collectionId, , songId] = appleMatch;
    const type = songId ? 'song' : rawType;
    const id = songId || collectionId;
    const embedUrl = songId
      ? `https://embed.music.apple.com/${region}/${type}/x/${collectionId}?i=${songId}`
      : `https://embed.music.apple.com/${region}/${rawType}/x/${collectionId}`;
    return {
      provider: 'apple',
      type,
      id,
      embedUrl,
      originalUrl: url,
    };
  }

  return null;
}
