import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getDashboardAuthConfig, isAuthorizedRequest } from '@/lib/dashboard-auth';

export function middleware(request: NextRequest) {
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
