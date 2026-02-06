'use client'

import { useState } from 'react'
import type { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row'] & {
  profiles: {
    email: string
    phone_number: string
  } | null
  design_selection: {
    design_type: 'normal' | 'custom'
    description: string | null
  } | null
}

interface BusinessListProps {
  businesses: Business[]
}

const quickTimeOptions = [
  { label: 'إيقاف فوري', minutes: -1, color: 'bg-red-500' },
  { label: '30 دقيقة', minutes: 30, color: 'bg-orange-500' },
  { label: '1 ساعة', minutes: 60, color: 'bg-amber-500' },
  { label: '24 ساعة', minutes: 1440, color: 'bg-yellow-500' },
  { label: '7 أيام', minutes: 10080, color: 'bg-blue-500' },
  { label: '30 يوم', minutes: 43200, color: 'bg-green-500' },
  { label: 'غير محدود', minutes: null, color: 'bg-zinc-500' },
]

export default function BusinessList({ businesses: initialBusinesses }: BusinessListProps) {
  const [businesses, setBusinesses] = useState(initialBusinesses)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showTimeModal, setShowTimeModal] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [customDays, setCustomDays] = useState('')
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSetTime = async (businessId: string, minutes: number | null) => {
    setLoading(businessId)
    setError(null)

    try {
      const response = await fetch(`/api/super-admin/businesses/${businessId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'فشل في تحديث الوقت')
      }

      const { data } = await response.json()
      
      setBusinesses(
        businesses.map((b) =>
          b.id === businessId ? { ...b, ...data } : b
        )
      )
      setShowTimeModal(null)
      setCustomDays('')
      setCustomHours('')
      setCustomMinutes('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  const handleCustomTime = (businessId: string) => {
    const days = parseInt(customDays) || 0
    const hours = parseInt(customHours) || 0
    const minutes = parseInt(customMinutes) || 0
    
    if (days === 0 && hours === 0 && minutes === 0) {
      setError('يرجى إدخال قيمة على الأقل')
      return
    }
    
    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes
    handleSetTime(businessId, totalMinutes)
  }

  const handleEditProfile = (business: Business) => {
    setEditingProfile(business.id)
    setEditEmail(business.profiles?.email || '')
    setEditPhone(business.profiles?.phone_number || '')
  }

  const handleSaveProfile = async (businessId: string) => {
    setLoading(`profile-${businessId}`)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/super-admin/businesses/${businessId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail.trim() || null,
          phone_number: editPhone.trim() || null
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'فشل في تحديث الملف الشخصي')
      }

      const result = await response.json()
      
      // Update local state
      setBusinesses(
        businesses.map((b) =>
          b.id === businessId
            ? {
                ...b,
                profiles: {
                  email: result.profile.email || '',
                  phone_number: result.profile.phone_number || ''
                }
              }
            : b
        )
      )
      
      setEditingProfile(null)
      setEditEmail('')
      setEditPhone('')
      setSuccess('تم تحديث الملف الشخصي بنجاح')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحديث')
    } finally {
      setLoading(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingProfile(null)
    setEditEmail('')
    setEditPhone('')
  }

  const handleSyncProfiles = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      // Try sync-profiles-direct first (uses REST API)
      let response = await fetch('/api/super-admin/sync-profiles-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      // If that fails, try the regular sync endpoint
      if (!response.ok) {
        response = await fetch('/api/super-admin/sync-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.hint || 'فشل في مزامنة الملفات الشخصية')
      }

      const result = await response.json()
      
      if (result.errors && result.errors.length > 0) {
        setSuccess(`${result.message} (${result.errors.length} أخطاء)`)
        setError(`بعض الأخطاء: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`)
      } else {
        setSuccess(result.message || `تمت المزامنة بنجاح: ${result.synced || 0} محدث، ${result.created || 0} جديد`)
      }
      
      // Reload the page after a short delay to show updated profiles
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء المزامنة')
    } finally {
      // Note: syncing will be reset on reload, but set it here in case reload doesn't happen
      setTimeout(() => setSyncing(false), 3000)
    }
  }

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    setLoading(`delete-${businessId}`)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/super-admin/businesses/${businessId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'فشل في حذف الحساب')
      }

      // Remove the business from the list
      setBusinesses(businesses.filter(b => b.id !== businessId))
      setShowDeleteConfirm(null)
      setSuccess(`تم حذف حساب "${businessName}" بنجاح`)
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حذف الحساب')
    } finally {
      setLoading(null)
    }
  }

  const getTimeRemaining = (expiresAt: string | null, status: string) => {
    if (!expiresAt) return null
    
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    // If expired, show expired message
    if (diff <= 0) {
      return { 
        text: 'منتهي', 
        color: 'text-red-600', 
        urgent: true,
        expired: true 
      }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 30) return { text: `${days} يوم متبقي`, color: 'text-green-600', urgent: false }
    if (days > 7) return { text: `${days} يوم متبقي`, color: 'text-blue-600', urgent: false }
    if (days > 0) return { text: `${days} يوم ${hours} س متبقي`, color: 'text-amber-600', urgent: true }
    if (hours > 0) return { text: `${hours} ساعة ${mins} د متبقي`, color: 'text-orange-600', urgent: true }
    return { text: `${mins} دقيقة متبقي`, color: 'text-red-600', urgent: true }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* Search and Sync */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="بحث بالاسم أو الرابط..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-base"
        />
        <button
          onClick={handleSyncProfiles}
          disabled={syncing}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          title="مزامنة الملفات الشخصية من auth.users"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري المزامنة...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              مزامنة الملفات الشخصية
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
          <p className="text-2xl font-bold text-zinc-900">{businesses.length}</p>
          <p className="text-sm text-zinc-500">إجمالي الحسابات</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
          <p className="text-2xl font-bold text-green-600">
            {businesses.filter(b => b.status === 'active').length}
          </p>
          <p className="text-sm text-zinc-500">نشط</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
          <p className="text-2xl font-bold text-amber-600">
            {businesses.filter(b => b.status === 'paused').length}
          </p>
          <p className="text-sm text-zinc-500">متوقف</p>
        </div>
      </div>

      {/* Business Cards */}
      <div className="space-y-4">
        {filteredBusinesses.map((business) => {
          const timeInfo = getTimeRemaining(business.expires_at, business.status)
          
          return (
            <div key={business.id} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Business Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-zinc-900">{business.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        business.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {business.status === 'active' ? 'نشط' : 'متوقف'}
                    </span>

                    {/* Design type (from design_selections when available) */}
                    {business.design_selection?.design_type === 'custom' ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-700">تصميم خاص</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600">تصميم عادي</span>
                    )}
                    {business.design_selection?.description && (
                      <div className="text-xs text-zinc-500 mt-1">{business.design_selection.description}</div>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {editingProfile === business.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">البريد الإلكتروني</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="example@email.com"
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">رقم الهاتف</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="+21612345678"
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            dir="ltr"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveProfile(business.id)}
                            disabled={loading === `profile-${business.id}`}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loading === `profile-${business.id}` ? 'جاري...' : 'حفظ'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={loading === `profile-${business.id}`}
                            className="px-3 py-1.5 bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-300 disabled:opacity-50"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-600">
                            <span className="text-zinc-400">البريد:</span>{' '}
                            {business.profiles?.email ? (
                              <span className="text-zinc-900" dir="ltr">{business.profiles.email}</span>
                            ) : (
                              <span className="text-zinc-400">غير متوفر</span>
                            )}
                          </p>
                          <button
                            onClick={() => handleEditProfile(business)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title="تعديل"
                          >
                            ✏️
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-600">
                            <span className="text-zinc-400">الهاتف:</span>{' '}
                            {business.profiles?.phone_number ? (
                              <span className="text-zinc-900" dir="ltr">{business.profiles.phone_number}</span>
                            ) : (
                              <span className="text-zinc-400">غير متوفر</span>
                            )}
                          </p>
                        </div>
                    <a
                      href={`/${business.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      dir="ltr"
                    >
                      /{business.slug}
                    </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Time & Actions */}
                <div className="flex flex-col items-end gap-3">
                  {/* Time Badge */}
                  <div className="text-left">
                    {business.expires_at ? (
                      <div className={`text-sm font-medium ${timeInfo?.color}`}>
                        {timeInfo?.urgent && '⚠️ '}
                        {timeInfo?.text || 'منتهي'}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-400">
                        {business.status === 'active' ? 'غير محدود' : 'لا يوجد وقت'}
                      </div>
                    )}
                    {business.expires_at && (
                      <div className="text-xs text-zinc-400 mt-0.5" dir="ltr">
                        {new Date(business.expires_at).toLocaleDateString('ar-TN')}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTimeModal(business.id)}
                      disabled={loading === business.id || loading === `delete-${business.id}` || loading === `profile-${business.id}` || editingProfile === business.id}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {loading === business.id ? 'جاري...' : 'تحديد الوقت'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(business.id)}
                      disabled={loading === business.id || loading === `delete-${business.id}` || loading === `profile-${business.id}` || editingProfile === business.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {loading === `delete-${business.id}` ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          جاري الحذف...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          حذف
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Modal */}
              {showTimeModal === business.id && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <p className="text-sm font-medium text-zinc-700 mb-3">اختر مدة الاشتراك:</p>
                  
                  {/* Quick Options */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {quickTimeOptions.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleSetTime(business.id, option.minutes)}
                        disabled={loading === business.id}
                        className={`px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors ${option.color} hover:opacity-90 disabled:opacity-50`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Time Inputs */}
                  <div className="border-t border-zinc-100 pt-4 mt-4">
                    <p className="text-sm font-medium text-zinc-700 mb-3">وقت مخصص:</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">الأيام</label>
                        <input
                          type="number"
                          min="0"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">الساعات</label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">الدقائق</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={customMinutes}
                          onChange={(e) => setCustomMinutes(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleCustomTime(business.id)}
                        disabled={!customDays && !customHours && !customMinutes || loading === business.id}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                      >
                        تطبيق
                      </button>
                      <button
                        onClick={() => {
                          setShowTimeModal(null)
                          setCustomDays('')
                          setCustomHours('')
                          setCustomMinutes('')
                        }}
                        className="px-4 py-2 text-zinc-500 text-sm font-medium hover:text-zinc-700"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm === business.id && (
                <div className="mt-4 pt-4 border-t border-red-100 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-red-900 mb-1">تأكيد الحذف</h4>
                      <p className="text-sm text-red-700">
                        هل أنت متأكد من حذف حساب <strong>"{business.name}"</strong>؟
                        <br />
                        <span className="text-xs text-red-600 mt-1 block">
                          سيتم حذف جميع البيانات المرتبطة بهذا الحساب بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      disabled={loading === `delete-${business.id}`}
                      className="px-4 py-2 text-zinc-600 text-sm font-medium hover:text-zinc-800 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleDeleteBusiness(business.id, business.name)}
                      disabled={loading === `delete-${business.id}`}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading === `delete-${business.id}` ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          جاري الحذف...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          نعم، احذف الحساب
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredBusinesses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
          <p className="text-zinc-500">لا توجد حسابات</p>
        </div>
      )}
    </div>
  )
}
