'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0)
  const [attemptCount, setAttemptCount] = useState<number>(0)
  const [rateLimited, setRateLimited] = useState<boolean>(false)
  const router = useRouter()
  const supabase = createClient()
  const localTesting = process.env.NEXT_PUBLIC_LOCAL_TESTING === 'true' // When true, treat missing profiles as owner for local testing

  // Check if user is already authenticated and redirect them
  // Do NOT call signOut() here as it can clear valid sessions that are still loading
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // User is already authenticated, get their role and redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle() as { data: { role: string } | null }
          
          const redirectUrl = profile?.role === 'super_admin' ? '/super-admin' : '/admin'
          window.location.replace(redirectUrl)
        }
      } catch {
        // Ignore errors - user will stay on login page
      }
    }
    checkExistingSession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent multiple submissions
    if (isSubmitting || loading) {
      return
    }

    // Validate and normalize inputs
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()
    
    if (!trimmedEmail || !trimmedPassword) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('يرجى إدخال بريد إلكتروني صحيح')
      return
    }

    // Rate limiting: prevent rapid successive attempts (allow up to 30 attempts)
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAttemptTime
    
    // Reset rate limit status and attempt count if more than 30 seconds have passed
    if (timeSinceLastAttempt > 30000) {
      setAttemptCount(0)
      setRateLimited(false)
    }
    
    // If rate limited, don't make the request at all
    if (rateLimited) {
      return // Silently ignore - rate limited
    }
    
    // Prevent if too many attempts in short time (max 30 attempts per 30 seconds)
    if (attemptCount >= 30 && timeSinceLastAttempt < 30000) {
      setRateLimited(true)
      // Auto-reset after 30 seconds
      setTimeout(() => {
        setRateLimited(false)
        setAttemptCount(0)
      }, 30000)
      return // Silently ignore - too many attempts
    }
    
    // Only prevent if less than 1 second between attempts
    if (timeSinceLastAttempt < 1000) {
      return // Silently ignore rapid attempts
    }
    
    setLastAttemptTime(now)
    setAttemptCount(prev => prev + 1)
    
    setError(null)
    setIsSubmitting(true)
    setLoading(true)

    try {
      // Clear any invalid sessions first to prevent conflicts
      try {
        await supabase.auth.signOut()
        // Small delay to ensure session is cleared
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch {
        // Ignore errors, continue with login
      }

      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      if (authError) {
        // Always clear session on error to prevent stale state
        try {
          await supabase.auth.signOut()
        } catch {
          // Ignore sign out errors
        }
        
        // Handle specific error cases - silently handle rate limit (allow up to 30 attempts)
        if (authError.status === 429 || authError.message.includes('rate limit') || authError.message.includes('429') || authError.message.includes('Request rate limit')) {
          // Set rate limited flag to prevent further requests
          setRateLimited(true)
          setAttemptCount(30) // Set to max to prevent more attempts
          // Auto-reset after 30 seconds
          setTimeout(() => {
            setRateLimited(false)
            setAttemptCount(0)
          }, 30000)
          // Don't show error message or log, just silently fail
          setLoading(false)
          setIsSubmitting(false)
          return
        }
        
        // Only log non-rate-limit errors
        console.error('Login error:', authError)
        
        if (authError.status === 400) {
          // 400 errors can mean invalid credentials or malformed request
          if (authError.message.includes('Invalid login credentials') || authError.message.includes('Invalid login') || authError.message.includes('Email not confirmed')) {
            if (authError.message.includes('Email not confirmed')) {
              setError('يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول')
            } else {
              setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
            }
          } else {
            setError('طلب غير صحيح. يرجى التحقق من بياناتك والمحاولة مرة أخرى.')
          }
        } else if (authError.message.includes('missing email') || authError.message.includes('missing phone')) {
          setError('يرجى إدخال البريد الإلكتروني وكلمة المرور')
        } else {
          setError(authError.message || 'حدث خطأ أثناء تسجيل الدخول')
        }
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      if (!data?.user) {
        setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.')
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      // Login successful

      // Get user profile to determine correct redirect URL
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle() as { data: { role: string } | null, error: any }

      if (profileError) {
        console.error('Profile fetch error:', profileError)
      }

      // Determine redirect URL based on role
      let role = profile?.role
      if (!role && localTesting) {
        // During local testing, allow users without DB profiles and treat them as owners
        role = 'owner'
      }

      let redirectUrl = '/admin'
      if (role === 'super_admin') {
        redirectUrl = '/super-admin'
      } else if (role === 'owner') {
        redirectUrl = '/admin'
      }

      // Redirecting
      
      // Use router.push for client-side navigation - cookies are already set by Supabase SSR
      router.push(redirectUrl)
      router.refresh()
    } catch (err: any) {
      console.error('[LoginForm] Unexpected error:', err)
      setError(err.message || 'حدث خطأ غير متوقع')
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  return (
    <form 
      className="space-y-5" 
      onSubmit={handleSubmit} 
      method="post"
      dir="rtl"
      noValidate
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            autoFocus
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>
      </div>
    </form>
  )
}
