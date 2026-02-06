'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MenuManager from '@/components/admin/MenuManager'
import AdminMenuEditorWrapper from '@/components/custom-design/AdminMenuEditorWrapper'

export default function MenuPage() {
  const [business, setBusiness] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [useCustomEditor, setUseCustomEditor] = useState(false)
  const [designType, setDesignType] = useState<'normal' | 'custom'>('normal')

  const router = useRouter()

  useEffect(() => {
    fetchBusiness()
  }, [])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/admin/business')
      
      // Check if response is OK and is JSON
      if (res.ok) {
        const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
          const data = await res.json()
          setBusiness(data)

          // Check if this business has custom design
          const hasCustomDesign = data?.design || data?.is_custom_design || data?.is_custom || data?.custom_design ||
            data?.is_custom_design === 'true' || data?.is_custom === 'true'
          if (hasCustomDesign) {
            setUseCustomEditor(true)
          }

          // Fetch design type from design_selections
          try {
            const dsRes = await fetch('/api/admin/business/design-selection')
            if (dsRes.ok) {
              const dsData = await dsRes.json()
              setDesignType(dsData.design_type || 'normal')
            }
          } catch (e) {
            console.error('Error fetching design selection:', e)
          }
        } else {
          // Response is not JSON (likely HTML redirect or error page)
          console.error('Error fetching business: Response is not JSON')
          // Try to reload the page to handle redirects
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      } else {
        // Handle non-OK responses
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json()
          console.error('Error fetching business:', errorData.error || 'Unknown error')
        } else {
          console.error('Error fetching business: HTTP', res.status)
          // If unauthorized, redirect to login
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      }
    } catch (err) {
      console.error('Error fetching business:', err)
      // If it's a JSON parse error, it means we got HTML instead of JSON
      if (err instanceof SyntaxError && err.message.includes('JSON')) {
        console.error('Received HTML instead of JSON - possible redirect or error page')
        // Try to reload to handle redirects
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-zinc-500">لم يتم العثور على نشاط تجاري</p>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-page p-4 lg:p-8 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors text-lg"
          >
            →
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-zinc-900">منشئ القائمة</h1>
            <p className="text-sm lg:text-base text-zinc-500">إدارة الفئات والعناصر</p>
          </div>
        </div>
        <div className="flex gap-2">
          {designType === 'custom' && !useCustomEditor && (
            <button
              onClick={() => setUseCustomEditor(true)}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              محرر التصميم المهني
            </button>
          )}
          {useCustomEditor && (
            <button
              onClick={() => setUseCustomEditor(false)}
              className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700"
            >
              العودة للمنشئ القياسي
            </button>
          )}
        </div>
      </div>

      {useCustomEditor ? (
        <AdminMenuEditorWrapper />
      ) : (
        <MenuManager businessId={business.id} />
      )}
    </div>
  )
}
