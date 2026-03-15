import { type NextRequest, NextResponse } from 'next/server'
import { getMiddlewareSession } from '@/lib/supabase/middleware'

/**
 * Protected routes that require authentication.
 * Users without a session will be redirected to /login.
 */
const PROTECTED_ROUTES = ['/app']

/**
 * Auth routes that authenticated users should not access.
 * Authenticated users will be redirected to /app.
 */
const AUTH_ROUTES = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { user, response } = await getMiddlewareSession(request)

  // Check if accessing protected route without auth
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if authenticated user is trying to access auth routes
  const isAuthRoute = AUTH_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
