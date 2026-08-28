import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge proxy (formerly middleware).
 *
 * Two jobs, both deliberately cheap:
 *
 *  1. Gate /app on the presence of a session cookie, so unauthenticated
 *     visitors are redirected to sign in without rendering a page. This is a
 *     convenience only — the cookie is not validated here. Every page and
 *     action under /app independently resolves and authorizes the session on
 *     the server.
 *  2. Apply the Content-Security-Policy. It lives here rather than in
 *     next.config so it can be varied per request as the policy tightens.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/app')) {
    const hasSession =
      request.cookies.has('__Secure-mconnect.session') || request.cookies.has('mconnect.session')
    if (!hasSession) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirectTo', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }

  const response = NextResponse.next()

  // 'unsafe-inline' on style-src is required by Tailwind's inlined critical CSS
  // and by the inline styles used for progress bars. Scripts are restricted to
  // the application's own origin.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  )

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
