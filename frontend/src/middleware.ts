import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect authenticated routes.
 * Redirects unauthenticated requests to /auth/sign-in.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Routes that don't require authentication
  const publicRoutes = ['/auth/sign-in', '/auth/sign-up', '/about', '/'];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // `auth_token` is short-lived (15m by default) and the browser drops it the
  // moment it expires, while `refresh_token` stays valid for days. Gating on
  // the access cookie alone therefore bounced anyone who merely navigated or
  // reloaded more than 15 minutes after signing in — a still-refreshable
  // session treated as a dead one.
  //
  // A present refresh cookie means the session can still be renewed, so let
  // the request through: apiClient's 401 -> /auth/refresh -> retry flow picks
  // it up on the first API call. Only redirect when neither cookie is there.
  const hasSession =
    request.cookies.has('auth_token') || request.cookies.has('refresh_token');

  if (!hasSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
