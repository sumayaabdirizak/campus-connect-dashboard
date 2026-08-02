import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './db/prisma.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auth } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { requireUploadAuth } from './middleware/requireUploadAuth.js';
import { configureTrustProxy, getCorsAllowlist } from './config/env.js';
import {
  announcementLinkRedirectLimiter,
  announcementLinkRedirectHandler,
} from './controllers/announcements/announcementLinkRedirect.handler.js';
import { mountRoutes } from './router/index.js';

const app = express();
configureTrustProxy(app);

// ─── Security headers (Helmet) ──────────────────────────────────────────────
// CSP is OFF because the frontend is on a different origin and shadcn uses
// inline styles. COEP is OFF because /uploads serves cross-origin images.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json());
app.use(requestLogger());

// ─── Static uploads with fallback to object storage ─────────────────────────
// Auth required for sensitive prefixes (submissions, assignments, chat, …).
// covers/ + announcements/ stay public for <img> / OG without a session.
// Raster images served inline; everything else forced to attachment (XSS defence).
app.use('/uploads', requireUploadAuth, (req, res, next) => {
  const inlineSafe = /\.(png|jpe?g|webp|gif)$/i.test(req.path);
  res.setHeader('Content-Disposition', inlineSafe ? 'inline' : 'attachment');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Relax CORP for uploads so cross-origin frontends can embed course covers.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads', { fallthrough: true }), async (req, res, next) => {
  // Object-storage fallback: files committed with STORAGE_DRIVER=s3 are not on
  // local disk — stream/redirect from the bucket using the same URL path.
  try {
    const { isObjectStorageEnabled, sendStoredFile } = await import('./storage/objectStorage.js');
    if (!isObjectStorageEnabled()) return res.status(404).end();
    const key = String(req.path || '').replace(/^\/+/, '');
    if (!key || key.includes('..')) return res.status(404).end();
    const inlineSafe = /\.(png|jpe?g|webp|gif)$/i.test(key);
    return sendStoredFile(res, key, { inline: inlineSafe });
  } catch (err) {
    console.error('[uploads] object-storage fallback failed:', err?.message || err);
    return next(err);
  }
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allowlist driven by env so prod can lock down to the production frontend
// origin. Credentialed requests require an exact origin match.
const corsAllowlist = getCorsAllowlist();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin / server-side fetches
    if (corsAllowlist.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Public CTR redirect (no auth). Must stay before the /api auth gate.
app.get('/api/r/:announcementId/:token', announcementLinkRedirectLimiter, announcementLinkRedirectHandler);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

// ─── Global API auth gate ────────────────────────────────────────────────────
// Logout is public so cookies can always be cleared even with an expired token.
app.use('/api', (req, res, next) => {
  const isPublicAuthRoute =
    (req.method === 'POST' &&
      (req.path === '/auth/login' ||
        req.path === '/auth/refresh' ||
        req.path === '/auth/logout')) ||
    (req.method === 'GET' && req.path === '/auth/csrf');
  if (isPublicAuthRoute) return next();
  return auth(req, res, next);
});
app.use('/api', csrfProtection);

// ─── Route groups ────────────────────────────────────────────────────────────
mountRoutes(app);

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export { app };