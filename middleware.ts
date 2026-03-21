import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getDashboardAuthConfig, isAuthorizedRequest } from '@/lib/dashboard-auth';

// SEC-002: Block cross-site POST/PUT/DELETE requests to prevent CSRF
function isCrossSiteMutation(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return true;
  }

  const origin = request.headers.get('origin');
  if (origin) {
    const requestHost = request.headers.get('host') || request.nextUrl.host;
    try {
      const originHost = new URL(origin).host;
      if (originHost !== requestHost) return true;
    } catch {
      return true;
    }
  }

  return false;
}

export function middleware(request: NextRequest) {
  // SEC-002: CSRF protection for state-changing requests
  if (isCrossSiteMutation(request)) {
    return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
  }

  const auth = getDashboardAuthConfig();
  if (!auth.enabled) {
    return NextResponse.next();
  }

  if (!auth.configured) {
    return new NextResponse(
      'Dashboard auth is enabled but credentials are missing. Set DASHBOARD_AUTH_USERNAME and DASHBOARD_AUTH_PASSWORD.',
      { status: 500 },
    );
  }

  if (isAuthorizedRequest(request.headers.get('authorization'), auth)) {
    return NextResponse.next();
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Claw Dash"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
