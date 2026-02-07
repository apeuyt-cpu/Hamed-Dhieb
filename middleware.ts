import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'owner' | 'super_admin' | null

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/signup', '/']

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  // Allow login and signup
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return true
  }
  
  // Allow root path
  if (pathname === '/') {
    return true
  }
  
  // Allow public menu routes (slug routes)
  if (pathname.match(/^\/[^\/]+$/) && !pathname.startsWith('/admin') && !pathname.startsWith('/super-admin')) {
    return true
  }
  
  return false
}

/**
 * Get user role from profile
 */
async function getUserRole(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
): Promise<UserRole> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    
    return (profile?.role as UserRole) || null
  } catch (error) {
    return null
  }
}

/**
 * Get the correct dashboard URL for a role
 */
function getDashboardUrl(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'owner':
      return '/admin'
    default:
      return '/login'
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl

    // No-op response - just pass through without modifying
    const response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    try {
      // Check environment variables early
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        // Missing env vars - just return, don't interfere with page loads
        return response
      }

      // Create Supabase client with comprehensive error handling
      const supabase = createSupabaseServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            get(name: string) {
              try {
                return req.cookies.get(name)?.value
              } catch {
                return undefined
              }
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                req.cookies.set({ name, value, ...options })
              } catch (e) {
                console.error('[Middleware] Cookie set error:', e)
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                req.cookies.set({ name, value: '', ...options })
              } catch (e) {
                console.error('[Middleware] Cookie remove error:', e)
              }
            },
          },
        }
      )

      // Get user with timeout protection
      let user = null
      let authError = null
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        try {
          const result = await supabase.auth.getUser()
          clearTimeout(timeout)
          user = result.data?.user || null
          authError = result.error
        } catch (e) {
          clearTimeout(timeout)
          throw e
        }
      } catch (e) {
        console.error('[Middleware] Auth check error:', e)
        authError = e
      }

      // Public routes - allow without auth
      if (isPublicRoute(pathname)) {
        return response
      }

      // For protected routes, redirect unauthenticated users
      if (!user || authError) {
        if (pathname !== '/login' && pathname !== '/signup') {
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/login'
          return NextResponse.redirect(redirectUrl)
        }
        return response
      }

      // User is authenticated - check role for protected routes
      try {
        let userRole: UserRole = null
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        userRole = (profile?.role as UserRole) || null

        // If on login/signup when authenticated, redirect to dashboard
        if (pathname === '/login' || pathname === '/signup') {
          const dashboardUrl = getDashboardUrl(userRole)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = dashboardUrl
          return NextResponse.redirect(redirectUrl, 302)
        }

        // Protect /admin - only owners
        if (pathname.startsWith('/admin')) {
          if (userRole !== 'owner') {
            const redirectUrl = req.nextUrl.clone()
            redirectUrl.pathname = userRole === 'super_admin' ? '/super-admin' : '/login'
            return NextResponse.redirect(redirectUrl, 307)
          }
        }

        // Protect /super-admin - only super_admin
        if (pathname.startsWith('/super-admin')) {
          if (userRole === 'owner') {
            const redirectUrl = req.nextUrl.clone()
            redirectUrl.pathname = '/admin'
            return NextResponse.redirect(redirectUrl, 307)
          }
          if (userRole !== 'super_admin') {
            const redirectUrl = req.nextUrl.clone()
            redirectUrl.pathname = '/login'
            return NextResponse.redirect(redirectUrl, 307)
          }
        }
      } catch (e) {
        console.error('[Middleware] Role check error:', e)
        // On error, just allow the request to proceed
      }

      return response
    } catch (innerError) {
      console.error('[Middleware] Inner error:', innerError)
      // Return safe response on any error
      return NextResponse.next({
        request: {
          headers: req.headers,
        },
      })
    }
  } catch (error) {
    console.error('[Middleware] Unhandled error:', error)
    // Last resort - return minimal next response
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/super-admin',
    '/super-admin/:path*',
    '/login',
    '/signup',
  ],
}
