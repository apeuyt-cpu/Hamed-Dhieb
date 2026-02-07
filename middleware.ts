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

    // Create initial response with headers from request
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[Middleware] Missing Supabase environment variables')
      return response
    }

    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            try {
              return req.cookies.get(name)?.value
            } catch (e) {
              return undefined
            }
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              req.cookies.set({
                name,
                value,
                ...options,
              })
            } catch (e) {
              console.error('[Middleware] Error setting cookie:', e)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              req.cookies.set({
                name,
                value: '',
                ...options,
              })
            } catch (e) {
              console.error('[Middleware] Error removing cookie:', e)
            }
          },
        },
      }
    )

    // Copy request cookies to response
    try {
      req.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value)
      })
    } catch (e) {
      console.error('[Middleware] Error copying cookies:', e)
    }

    // Check authentication
    let user = null
    let authError = null
    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user || null
      authError = authResult.error
    } catch (e) {
      console.error('[Middleware] Error getting user:', e)
      authError = e
    }

    // Debug logging
    if (pathname === '/admin' || pathname === '/login') {
      const errorMsg = authError && typeof authError === 'object' && 'message' in authError ? authError.message : 'none'
      console.log('[Middleware]', pathname, '- User:', user?.id || 'none', 'Error:', errorMsg)
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
          const redirectResponse = NextResponse.redirect(redirectUrl, 302)
          try {
            req.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie.name, cookie.value)
            })
          } catch (e) {
            console.error('[Middleware] Error setting cookies on redirect:', e)
          }
          return redirectResponse
        } catch (error) {
          console.error('[Middleware] Error getting user role:', error)
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/admin'
          const redirectResponse = NextResponse.redirect(redirectUrl, 302)
          try {
            req.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie.name, cookie.value)
            })
          } catch (e) {
            console.error('[Middleware] Error setting cookies on redirect:', e)
          }
          return redirectResponse
        }
      }
    }
    
    // Allow public routes
    if (isPublicRoute(pathname)) {
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
        try {
          req.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
        } catch (e) {
          console.error('[Middleware] Error setting cookies on redirect:', e)
        }
        return redirectResponse
      }
      return response
    }

    // Get user role
    let userRole = null
    try {
      userRole = await getUserRole(supabase, user.id)
      if (!userRole && process.env.LOCAL_TESTING === 'true') {
        userRole = 'owner'
      }
    } catch (e) {
      console.error('[Middleware] Error getting user role:', e)
      userRole = null
    }

    // Protect /admin routes - only allow owners
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'owner') {
        const redirectUrl = req.nextUrl.clone()
        
        if (userRole === 'super_admin') {
          redirectUrl.pathname = '/super-admin'
        } else {
          redirectUrl.pathname = '/login'
        }
        
        const redirectResponse = NextResponse.redirect(redirectUrl, 307)
        try {
          req.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
        } catch (e) {
          console.error('[Middleware] Error setting cookies on redirect:', e)
        }
        return redirectResponse
      }
    }

    // Protect /super-admin routes - only allow super_admin
    if (pathname.startsWith('/super-admin')) {
      if (userRole === 'owner') {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/admin'
        const redirectResponse = NextResponse.redirect(redirectUrl, 307)
        try {
          req.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
        } catch (e) {
          console.error('[Middleware] Error setting cookies on redirect:', e)
        }
        return redirectResponse
      }
      
      if (userRole !== 'super_admin') {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        const redirectResponse = NextResponse.redirect(redirectUrl, 307)
        try {
          req.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
          })
        } catch (e) {
          console.error('[Middleware] Error setting cookies on redirect:', e)
        }
        return redirectResponse
      }
    }

    return response
  } catch (error) {
    console.error('[Middleware] Unhandled error:', error)
    // Return a next response on any unhandled error to prevent middleware invocation failure
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
