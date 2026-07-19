import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'auth_token';

function apiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Cookie soft-gate for /dashboard. Only enforces when the HttpOnly
 * `auth_token` is expected on this page origin (same host as API, or
 * localhost / 127.0.0.1 any-port). Cross-origin API+app without a shared
 * cookie domain still relies on client RoleGuard + API auth.
 */
function sessionCookieVisibleOnPage(request: NextRequest): boolean {
  const api = apiOrigin();
  if (!api) return true;
  try {
    const pageHost = request.nextUrl.hostname;
    const apiHost = new URL(api).hostname;
    if (api === request.nextUrl.origin) return true;
    if (pageHost === 'localhost' && apiHost === 'localhost') return true;
    if (pageHost === '127.0.0.1' && apiHost === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (!sessionCookieVisibleOnPage(request)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/auth/sign-in' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/sign-in']
};
