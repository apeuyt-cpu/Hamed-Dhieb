'use client'

import SignupForm from '@/components/auth/SignupForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  // Removed client-side auth check - middleware handles redirecting authenticated users
  // This prevents infinite redirect loops

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 p-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">العودة للصفحة الرئيسية</span>
          </Link>

          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Scaniha"
                width={180}
                height={60}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-2">
              إنشاء حساب جديد
            </h1>
            <p className="text-zinc-500 text-sm">
              ابدأ رحلتك مع Scaniha
            </p>
          </div>

          <SignupForm />
        </div>

        <div className="text-center mt-6">
          <a 
            href="/login" 
            className="text-sm text-zinc-600 hover:text-zinc-900 font-medium"
          >
            لديك حساب بالفعل؟ <span className="text-zinc-900 font-semibold">سجل الدخول</span>
          </a>
        </div>
      </div>
    </div>
  )
}
