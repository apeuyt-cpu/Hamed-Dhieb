import { createServerClient } from './supabase/server'
import { redirect } from 'next/navigation'
import type { Database } from './supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type Profile = Database['public']['Tables']['profiles']['Row']
type UserRole = 'owner' | 'super_admin'
type SupabaseClientType = Awaited<ReturnType<typeof createServerClient>>

interface AuthResult {
  user: { id: string; email?: string }
  supabase: SupabaseClientType
  profile: Profile
}

/**
 * Get the current authenticated user
 * Redirects to login if not authenticated
 */
export async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  return { user, supabase }
}

/**
 * Get user profile with role information
 * Redirects to login if profile not found
 */
export async function getUserProfile(userId: string, supabase: SupabaseClientType) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('[AUTH] Profile fetch error:', error)
    redirect('/login')
  }
  
  if (!profile) {
    console.error(`[AUTH] Profile not found for user ${userId}`)
    redirect('/login')
  }
  
  return profile
}

/**
 * Get the correct dashboard URL for a user role
 */
export function getDashboardUrl(role: UserRole | null): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'owner':
      return '/admin'
    default:
      return '/login'
  }
}

/**
 * Require authentication - returns user and supabase client
 * Redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AuthResult> {
  const { user, supabase } = await getAuthUser()
  const profile = await getUserProfile(user.id, supabase)
  
  return { user, supabase, profile }
}

/**
 * Require owner role - redirects to appropriate dashboard if wrong role
 * Only owners can access this
 */
export async function requireOwner(): Promise<AuthResult> {
  const { user, supabase, profile } = await requireAuth()
  
  // If user is super_admin, redirect them to their dashboard
  if (profile.role === 'super_admin') {
    redirect('/super-admin')
  }
  
  // Only allow owners
  if (profile.role !== 'owner') {
    console.error(`[AUTH] User ${user.id} has role '${profile.role}', expected 'owner'`)
    redirect('/login')
  }
  
  return { user, supabase, profile }
}

/**
 * Require super_admin role - redirects to appropriate dashboard if wrong role
 * Only super_admins can access this
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const { user, supabase, profile } = await requireAuth()
  
  // CRITICAL: Block owners from accessing super-admin routes
  if (profile.role === 'owner') {
    console.warn(`[AUTH] Owner ${user.id} attempted to access super-admin. Redirecting to /admin`)
    redirect('/admin')
  }
  
  // Only allow super_admin
  if (profile.role !== 'super_admin') {
    console.error(`[AUTH] User ${user.id} has role '${profile.role}', expected 'super_admin'`)
    redirect('/login')
  }
  
  return { user, supabase, profile }
}

/**
 * Get current user (non-blocking, returns null if not authenticated)
 * Useful for components that need to check auth state without redirecting
 */
export async function getCurrentUser() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

/**
 * Get current user profile (non-blocking, returns null if not authenticated)
 */
export async function getCurrentProfile() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    return profile
  } catch {
    return null
  }
}
