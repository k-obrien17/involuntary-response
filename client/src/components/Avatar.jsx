/**
 * Avatar component -- Gravatar with initials fallback.
 *
 * Props:
 *   emailHash (string) -- MD5 hash of email for Gravatar lookup
 *   displayName (string) -- Used for initials fallback
 *   size (number, default 32) -- Pixel size (rendered as width/height)
 *   className (string, optional) -- Additional CSS classes
 *
 * Strategy: Render initials on a colored background. Layer a Gravatar
 * image on top with d=blank (transparent fallback). If the user has
 * a Gravatar, it covers the initials. If not, the transparent image
 * reveals the initials underneath. No error handling or loading states needed.
 */
export default function Avatar({ emailHash, displayName, size = 32, className = '' }) {
  const initials = getInitials(displayName || '');
  const bgColor = emailHash ? `#${emailHash.slice(0, 6)}` : '#6b7280';
  const gravatarUrl = emailHash
    ? `https://gravatar.com/avatar/${emailHash}?d=blank&s=${size * 2}`
    : null;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
      }}
    >
      <span
        className="text-white font-medium select-none"
        style={{ fontSize: size * 0.4 }}
      >
        {initials}
      </span>
      {gravatarUrl && (
        <img
          src={gravatarUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full rounded-full"
        />
      )}
    </div>
  );
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
