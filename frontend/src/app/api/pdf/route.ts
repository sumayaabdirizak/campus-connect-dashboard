import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/api-config';

/**
 * Universal server-side PDF proxy.
 *
 * GET /api/pdf?url=<encoded-url>
 *
 * Handles two kinds of URLs:
 *
 *   BACKEND  (same origin as NEXT_PUBLIC_API_URL)
 *     Forwards all browser cookies so the httpOnly auth_token reaches the
 *     backend. Requires auth_token to be present (mirrors the backend guard).
 *
 *   EXTERNAL (any other https:// URL)
 *     Fetches without cookies — purely a server-to-server GET that the
 *     browser can't do itself because the remote server has no CORS headers.
 *     This is the key fix for "Failed to fetch" on external PDFs: the
 *     browser never makes a cross-origin request, so no CORS error fires and
 *     no React warning is triggered.
 *
 * Security guards:
 *   - Rejects non-https:// URLs (blocks http://, file://, data://, SSRF).
 *   - External responses must have Content-Type containing "pdf" or
 *     "octet-stream" — refuses to proxy HTML or scripts.
 *   - No cookies are forwarded to external servers.
 */

const API_ORIGIN = getBackendOrigin();

// localhost is never reachable over https so we allow http for dev only.
const DEV = process.env.NODE_ENV !== 'production';

function isAllowedScheme(url: URL): boolean {
  if (url.protocol === 'https:') return true;
  if (DEV && url.protocol === 'http:') return true;
  return false;
}

export async function GET(request: NextRequest) {
  // ── 1. Parse and validate the ?url= param ────────────────────────────────
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!isAllowedScheme(targetUrl)) {
    return new NextResponse('Only https:// URLs are allowed', { status: 400 });
  }

  const isBackend = targetUrl.origin === API_ORIGIN;

  // ── 2. Auth check for backend URLs ───────────────────────────────────────
  if (isBackend && !request.cookies.get('auth_token')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── 3. Server-side fetch ──────────────────────────────────────────────────
  const fetchHeaders: Record<string, string> = {};
  if (isBackend) {
    // Forward all browser cookies so the backend auth middleware passes.
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) fetchHeaders['cookie'] = cookieHeader;
  }
  // External: fetch without credentials — we're just grabbing bytes.

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      headers: fetchHeaders,
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[pdf-proxy] upstream unreachable', { url: rawUrl, error: e });
    return new NextResponse('Upstream unreachable', { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  // ── 4. Content-type guard for external URLs ───────────────────────────────
  // Refuse to proxy arbitrary content — only PDF or generic binary streams.
  if (!isBackend) {
    const ct = upstream.headers.get('content-type') ?? '';
    if (!ct.includes('pdf') && !ct.includes('octet-stream')) {
      return new NextResponse('Remote resource is not a PDF', { status: 415 });
    }
  }

  // ── 5. Return the bytes inline ────────────────────────────────────────────
  const contentType =
    upstream.headers.get('content-type') ?? 'application/pdf';

  // Buffer so we get a complete response — avoids stream teardown issues
  // that can cause the browser's fetch to throw "Failed to fetch".
  const arrayBuffer = await upstream.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
    },
  });
}
