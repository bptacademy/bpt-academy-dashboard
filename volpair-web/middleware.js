import { NextResponse } from 'next/server';

// On the support subdomain, serve the Help Centre at the root.
export function middleware(request) {
  const host = request.headers.get('host') || '';
  if (host.startsWith('support.') && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/help';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/'] };
