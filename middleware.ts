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
  const { pathname } = req.nextUrl
  
  // Create Supabase client for middleware
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check authentication - this will automatically refresh the session if needed
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Debug logging
  if (pathname === '/admin' || pathname === '/login') {
    console.log('[Middleware]', pathname, '- User:', user?.id || 'none', 'Error:', authError?.message || 'none')
  }

  // If user is authenticated and trying to access login/signup, redirect to their dashboard
  if (user && !authError) {
    if (pathname === '/login' || pathname === '/signup') {
      try {
        let userRole = await getUserRole(supabase, user.id)
        // If running locally and no profile exists, treat the authenticated user as an owner to simplify testing
        if (!userRole && process.env.LOCAL_TESTING === 'true') {
          userRole = 'owner'
        }

        const dashboardUrl = getDashboardUrl(userRole)
        
        console.log('[Middleware] Redirecting authenticated user from', pathname, 'to', dashboardUrl)
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = dashboardUrl
        // Use 302 (temporary redirect) instead of 307 to allow browser to handle cookies properly
        const redirectResponse = NextResponse.redirect(redirectUrl, 302)
        // Copy cookies from the response to preserve session
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      } catch (error) {
        console.error('[Middleware] Error getting user role:', error)
        // If we can't get role but user is authenticated, redirect to admin as default
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/admin'
        const redirectResponse = NextResponse.redirect(redirectUrl, 302)
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    }
  }
  
  // Allow public routes (but only if user is not authenticated)
  if (isPublicRoute(pathname)) {
    // If user is authenticated, don't allow access to login/signup (handled above)
    // But allow other public routes
    return response
  }

  // For protected routes, check authentication
  if (authError || !user) {
    // Only redirect to login if we're not already on login/signup
    if (pathname !== '/login' && pathname !== '/signup') {
      console.log('[Middleware] Redirecting unauthenticated user from', pathname, 'to /login')
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    // If already on login/signup and not authenticated, allow access
    return response
  }

  // Get user role
  let userRole = await getUserRole(supabase, user.id)
  if (!userRole && process.env.LOCAL_TESTING === 'true') {
    // When running locally, treat missing profiles as owners for easier testing
    userRole = 'owner'
  }

  // Protect /admin routes - only allow owners
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'owner') {
      const redirectUrl = req.nextUrl.clone()
      
      // Redirect super_admin to their dashboard
      if (userRole === 'super_admin') {
        redirectUrl.pathname = '/super-admin'
        const redirectResponse = NextResponse.redirect(redirectUrl, 307)
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
      
      // Redirect others to login
      redirectUrl.pathname = '/login'
      const redirectResponse = NextResponse.redirect(redirectUrl, 307)
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
  }

  // Protect /super-admin routes - only allow super_admin
  // CRITICAL: Block owners from accessing super-admin
  if (pathname.startsWith('/super-admin')) {
    if (userRole === 'owner') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/admin'
      const redirectResponse = NextResponse.redirect(redirectUrl, 307)
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    
    if (userRole !== 'super_admin') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      const redirectResponse = NextResponse.redirect(redirectUrl, 307)
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
  }

  return response
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
