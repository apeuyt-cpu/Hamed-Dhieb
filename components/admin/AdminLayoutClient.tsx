'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DynamicFavicon from '@/components/admin/DynamicFavicon'
import type { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

interface AdminLayoutClientProps {
  business: Business | null
  children: React.ReactNode
}

export default function AdminLayoutClient({ business: initialBusiness, children }: AdminLayoutClientProps) {
  const [business, setBusiness] = useState<Business | null>(initialBusiness)
  const [showCreateForm, setShowCreateForm] = useState(!initialBusiness)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!businessName.trim()) {
      setError('يرجى إدخال اسم النشاط التجاري')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: businessName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء النشاط التجاري')
      }

      setBusiness(data)
      setShowCreateForm(false)
      setBusinessName('')
      // Refresh the page to load the new business
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-100" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md mx-auto border border-zinc-200">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2 text-center">لم يتم العثور على عمل</h1>
          <p className="text-zinc-600 text-center mb-6">يرجى إنشاء عمل للمتابعة.</p>
          
          {showCreateForm ? (
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 mb-2">
                  اسم النشاط التجاري
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                  placeholder="اسم المطعم أو المقهى"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎁</div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">تجربة مجانية لمدة 7 أيام</p>
                    <p className="text-xs text-blue-700 mt-0.5">ابدأ الآن واستمتع بكل الميزات</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-colors"
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء عمل'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 transition-colors"
            >
              إنشاء عمل جديد
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-100" dir="rtl">
      <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
