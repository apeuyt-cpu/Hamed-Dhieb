'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SuperAdminNav() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav 
      className="bg-gradient-to-l from-red-600 to-red-700 shadow-lg super-admin-nav"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <Link
              href="/super-admin"
              className="text-white font-bold text-lg"
            >
              لوحة المشرف
            </Link>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {loading ? 'جاري الخروج...' : 'تسجيل الخروج'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
