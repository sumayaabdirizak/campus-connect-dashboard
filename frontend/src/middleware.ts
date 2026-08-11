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

  // Check for auth token (httpOnly cookie)
  const hasAuthToken = request.cookies.has('auth_token');

  if (!hasAuthToken && pathname.startsWith('/dashboard')) {
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
