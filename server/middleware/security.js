import helmet from 'helmet';

/**
 * Security headers middleware.
 *
 * Uses helmet with CSP directives tailored to the embed providers
 * supported by the app (Spotify, YouTube, Vimeo, SoundCloud, Bandcamp,
 * Apple Music). Manually sets X-XSS-Protection since helmet v8 removed it.
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: [
        "'self'",
        'https://open.spotify.com',
        'https://www.youtube.com',
        'https://player.vimeo.com',
        'https://w.soundcloud.com',
        'https://*.bandcamp.com',
        'https://embed.music.apple.com',
      ],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  frameguard: { action: 'deny' },
});

export function securityHeaders(req, res, next) {
  helmetMiddleware(req, res, () => {
    // Helmet v8 removed xXssProtection — set it manually
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

/**
 * Defense-in-depth origin validation for state-changing requests.
 *
 * The real CSRF protection is that JWT is sent via the Authorization header,
 * which browsers don't auto-attach cross-origin. This is an additional layer.
 */
export function validateOrigin(req, res, next) {
  const method = req.method.toUpperCase();

  // Only check state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const origin = req.headers.origin;

  // No Origin header — allow (server-to-server, curl, etc.)
  if (!origin) {
    return next();
  }

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
  ].filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden' });
}
