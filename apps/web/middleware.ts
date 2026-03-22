import { NextRequest, NextResponse } from 'next/server';

const EXPLICIT_ORIGINS: Set<string> = new Set(
  (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
);

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = (() => {
  const patterns: RegExp[] = [];
  if (process.env.NODE_ENV !== 'production') {
    patterns.push(/^http:\/\/localhost:\d+$/);
    patterns.push(/^http:\/\/127\.0\.0\.1:\d+$/);
  }
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (appDomain) {
    const escaped = appDomain.replace(/\./g, '\\.');
    patterns.unshift(new RegExp(`^https://[\\w-]+\\.${escaped}$`));
  }
  return patterns;
})();

function isAllowedOrigin(origin: string): boolean {
  return EXPLICIT_ORIGINS.has(origin) ||
    ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/proxy/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');

  if (!origin || !isAllowedOrigin(origin)) {
    return NextResponse.next();
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const response = NextResponse.next();
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: '/api/proxy/:path*',
};
