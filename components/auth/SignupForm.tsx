'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/utils/slug'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [designType, setDesignType] = useState<'normal' | 'custom'>('normal')
  const [businessDescription, setBusinessDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const localTesting = process.env.NEXT_PUBLIC_LOCAL_TESTING === 'true' // When true, skip DB writes for local testing

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!email || !password || !phoneNumber || !businessName) {
      setError('يرجى ملء جميع الحقول')
      setLoading(false)
      return
    }
    // If custom design, you may want to handle extra fields here in the future

    const slug = generateSlug(businessName)
    
    // Check if email already exists
    const { data: existingEmail } = await (supabase
      .from('profiles') as any)
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingEmail) {
      setError('البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.')
      setLoading(false)
      return
    }
    
    // Check if business name already exists
    const { data: existingBusinessName } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('name', businessName.trim())
      .maybeSingle()

    if (existingBusinessName) {
      setError('اسم النشاط التجاري مستخدم بالفعل. يرجى اختيار اسم آخر.')
      setLoading(false)
      return
    }
    
    // Check if slug already exists
    const { data: existingSlug } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      setError('اسم النشاط التجاري يُنشئ رابط مستخدم بالفعل. يرجى اختيار اسم آخر.')
      setLoading(false)
      return
    }

    try {
      // Removed verbose debug logs for production
      
      // Verify Supabase is initialized
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('[Signup] Missing Supabase environment variables in client')
        setError('فشل إعداد الخدمات - لم يتم تكوين Supabase. يرجى التواصل مع مسؤول النظام. (Configuration Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
        setLoading(false)
        return
      }

      // Step 1: Sign up user
      let authData: any = null
      let authError: any = null
      try {
        // Attempting to sign up
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone_number: phoneNumber,
              design_type: designType,
              business_description: businessDescription || null
            }
          }
        })
        authData = result.data
        authError = result.error
        // signUp response received
      } catch (fetchErr: any) {
        console.error('signUp fetch error:', fetchErr)
        const errorMsg = fetchErr?.message || fetchErr?.toString() || 'Unknown error'
        setError(`فشل إنشاء الحساب: ${errorMsg}. تحقق من وحدة تحكم الشبكة (Network tab).`)
        setLoading(false)
        return
      }

      if (authError || !authData?.user) {
        const errorMsg = authError?.message || 'فشل إنشاء حساب المستخدم'
        console.error('Auth error:', authError)
        setError(errorMsg)
        setLoading(false)
        return
      }

      const userId = authData.user.id

      // If local testing is enabled, skip database writes (profiles/businesses)
      if (localTesting) {
        // Local testing enabled - skipping profile and business creation
        // Redirect to admin menu (editor will open if user chose custom design)
        window.location.href = '/admin/menu'
        return
      }

      // Step 2: Wait for profile trigger
      let profileExists = false
      try {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 300))
          const { data: profile, error: profileError } = await (supabase
            .from('profiles') as any)
            .select('user_id')
            .eq('user_id', userId)
            .single()
          
          if (profile) {
            profileExists = true
            break
          }
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.warn('Profile query error:', profileError)
          }
        }
      } catch (err) {
        console.error('Error waiting for profile:', err)
      }

      // Step 3: Ensure profile exists and has email/phone
      try {
        if (!profileExists) {
          const { error: profileError } = await (supabase
            .from('profiles') as any)
            .insert({
              user_id: userId,
              email: email.toLowerCase().trim(),
              phone_number: phoneNumber.trim(),
              role: 'owner'
            })
          
          if (profileError) {
            console.error('Profile insert error:', profileError)
            setError('فشل إنشاء الملف الشخصي. يرجى المحاولة مرة أخرى.')
            setLoading(false)
            return
          }
        } else {
          // Update both email and phone number if profile exists
          const { error: updateError } = await (supabase
            .from('profiles') as any)
            .update({ 
              email: email.toLowerCase().trim(),
              phone_number: phoneNumber.trim()
            })
            .eq('user_id', userId)
          
          if (updateError) {
            console.warn('Error updating profile:', updateError)
          }
        }
      } catch (err) {
        console.error('Profile creation/update error:', err)
      }

      // Step 4: Create business with 7-day free trial
      try {
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + 7)
        
        const insertPayload: any = {
          owner_id: userId,
          name: businessName,
          slug: slug,
          expires_at: expirationDate.toISOString(),
          status: 'active'
        }

        const { data: createdBusiness, error: businessError } = await (supabase
          .from('businesses') as any)
          .insert(insertPayload)
          .select('id')
          .single()

        if (businessError) {
          console.error('Business creation error:', businessError)
          if (businessError.code === '23505') {
            setError('اسم النشاط التجاري مستخدم بالفعل. تم إنشاء الحساب ولكن فشل إعداد النشاط. يرجى المحاولة لاحقاً.')
          } else {
            setError(businessError.message || 'فشل إنشاء النشاط التجاري. تم إنشاء حسابك. يرجى إضافة نشاطك من لوحة التحكم.')
          }
          setLoading(false)
          setTimeout(() => {
            window.location.href = '/admin/menu'
          }, 2000)
          return
        }

        // Create design_selections row
        try {
          if (createdBusiness && (createdBusiness as any).id) {
            const dsPayload: any = {
              business_id: (createdBusiness as any).id,
              design_type: designType,
              description: businessDescription || null
            }

            const { error: dsError } = await (supabase.from('design_selections') as any).insert(dsPayload)
            if (dsError) {
              console.warn('Failed to insert design_selections row:', dsError)
            }
          }
        } catch (err) {
          console.warn('Error creating design_selections row:', err)
        }

        // Success! Redirect to admin menu
        // User signup completed successfully
        window.location.href = '/admin/menu'
      } catch (err: any) {
        console.error('Business creation step error:', err)
        setError(err?.message || 'حدث خطأ أثناء إنشاء النشاط التجاري. يرجى المحاولة مرة أخرى.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Outer catch error:', err)
      setError(err?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
      setLoading(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} dir="rtl">
      {/* Design Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">نوع التصميم</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="designType"
              value="normal"
              checked={designType === 'normal'}
              onChange={() => setDesignType('normal')}
              className="accent-zinc-900"
            />
            <span>تصميم عادي</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="designType"
              value="custom"
              checked={designType === 'custom'}
              onChange={() => setDesignType('custom')}
              className="accent-cyan-600"
            />
            <span>تصميم خاص</span>
          </label>
        </div>
      </div>

      {/* Design info and optional business description (shown for both design types) */}
      <div className="mb-4">
        {designType === 'custom' ? (
          <div className="mb-4 p-4 border rounded-xl bg-white shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-50 rounded flex items-center justify-center text-cyan-600 font-bold">✦</div>
              <div>
                <div className="font-semibold text-zinc-900">لقد اخترت تصميمًا خاصًا</div>
                <p className="text-sm text-zinc-600 mt-1">ستتمكن من تصميم قائمتك بالكامل من لوحة التحكم بعد التسجيل.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 border rounded-xl bg-white shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-zinc-50 rounded flex items-center justify-center text-zinc-500 font-bold">✓</div>
              <div>
                <div className="font-semibold text-zinc-900">لقد اخترت تصميمًا عاديًا</div>
                <p className="text-sm text-zinc-600 mt-1">سيتم استخدام قالب افتراضي لنشاطك التجاري يمكنك تخصيصه لاحقًا من لوحة التحكم.</p>
              </div>
            </div>
          </div>
        )}

        <label className="block text-sm font-medium text-zinc-700 mb-2">وصف النشاط التجاري (اختياري)</label>
        <textarea
          rows={3}
          className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
          placeholder="أدخل وصفًا مختصرًا عن نشاطك — يظهر للزوار ويساعدهم على التعرف عليك."
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
        />
      </div> 

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
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
            autoComplete="new-password"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-2">
            رقم الهاتف
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="+21612345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            dir="ltr"
          />
        </div>
        
        <div>
          <label htmlFor="business" className="block text-sm font-medium text-zinc-700 mb-2">
            اسم النشاط التجاري
          </label>
          <input
            id="business"
            name="business"
            type="text"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="اسم المطعم أو المقهى"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
      </div>

      {/* Free Trial Banner */}
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎁</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">تجربة مجانية لمدة 7 أيام</p>
            <p className="text-xs text-blue-700 mt-0.5">ابدأ الآن واستمتع بكل الميزات</p>
          </div>
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
          disabled={loading}
          className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-colors"
        >
          {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
        </button>
      </div>
    </form>
  )
}
