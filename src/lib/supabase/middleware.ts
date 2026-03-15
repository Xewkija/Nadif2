import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for use in middleware.
 * This client can refresh the user's session and update cookies.
 */
export async function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response }
}

/**
 * Refreshes the user's session if needed and returns auth state.
 * Call this in middleware to keep sessions fresh.
 */
export async function getMiddlewareSession(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request)

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  return { user, response, supabase }
}
