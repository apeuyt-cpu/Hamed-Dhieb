'use client'

import { useState } from 'react'
import LogoUpload from '@/components/business/LogoUpload'
import SocialMediaManager from '@/components/admin/SocialMediaManager'
import MenuColorPicker from '@/components/admin/MenuColorPicker'
import { createClient } from '@/lib/supabase/client'

interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color?: string | null
}

export default function SettingsManager({ 
  business, 
  onUpdate 
}: { 
  business: Business
  onUpdate: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(business.name)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await (supabase
        .from('businesses') as any)
        .update({ name })
        .eq('id', business.id)

      if (error) throw error
      setEditing(false)
      onUpdate()
    } catch (err: any) {
      alert(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${business.slug}`
    : `/${business.slug}`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden" dir="rtl">
      <div className="p-5 lg:p-6 border-b border-zinc-200">
        <h3 className="text-xl lg:text-2xl font-bold text-zinc-900">الإعدادات</h3>
        <p className="text-sm lg:text-base text-zinc-600 mt-1">إدارة معلومات عملك</p>
      </div>
      <div className="p-5 lg:p-6 space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm lg:text-base font-medium text-zinc-700 mb-2">الشعار</label>
          <LogoUpload 
            businessId={business.id} 
            currentLogoUrl={business.logo_url}
            onLogoUpdated={onUpdate}
          />
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-sm lg:text-base font-medium text-zinc-700 mb-2">اسم العمل</label>
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-zinc-900 text-sm lg:text-base"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm lg:text-base hover:bg-zinc-800 disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => {
                    setName(business.name)
                    setEditing(false)
                  }}
                  className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg text-sm lg:text-base hover:bg-zinc-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <span className="text-sm lg:text-base text-zinc-900">{business.name}</span>
              <button
                onClick={() => setEditing(true)}
                className="text-orange-600 hover:text-orange-700 text-sm lg:text-base font-medium"
              >
                تعديل
              </button>
            </div>
          )}
        </div>

        {/* Menu URL */}
        <div>
          <label className="block text-sm lg:text-base font-medium text-zinc-700 mb-2">رابط القائمة</label>
          <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg">
            <code className="flex-1 text-xs lg:text-sm text-zinc-600 truncate" dir="ltr">{menuUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(menuUrl)
                alert('تم نسخ الرابط!')
              }}
              className="px-3 py-1.5 bg-zinc-200 text-zinc-700 rounded-lg text-xs lg:text-sm hover:bg-zinc-300"
            >
              نسخ
            </button>
          </div>
        </div>

        {/* Menu Color */}
        <div>
          <MenuColorPicker
            businessId={business.id}
            currentColor={business.primary_color || null}
            onColorUpdated={onUpdate}
          />
        </div>
      </div>
      
      {/* Social Media */}
      <div className="border-t border-zinc-200 p-5 lg:p-6">
        <SocialMediaManager businessId={business.id} />
      </div>
    </div>
  )
}
