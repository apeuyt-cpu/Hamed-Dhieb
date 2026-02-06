'use client'

import React, { useState, useEffect } from 'react'

interface DesignVersionInfo {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

export default function QRDesignLinker() {
  const [designs, setDesigns] = useState<DesignVersionInfo[]>([])
  const [linkedDesignId, setLinkedDesignId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchDesignsAndLink()
  }, [])

  const fetchDesignsAndLink = async () => {
    try {
      setLoading(true)
      // Fetch all designs
      const designRes = await fetch('/api/admin/business/design-versions')
      if (!designRes.ok) {
        try {
          const errData = await designRes.json()
          if (designRes.status === 401) {
            window.location.href = '/login'
            return
          }
          console.error('Designs API error', designRes.status, errData)
        } catch (e) {
          console.error('Failed to parse designs error response', e)
        }
        throw new Error('فشل تحميل التصاميم')
      }
      const designData = await designRes.json()
      setDesigns(designData.designs || [])

      // Fetch linked design
      const linkRes = await fetch('/api/admin/business/qr-link-design')
      if (linkRes.ok) {
        const linkData = await linkRes.json()
        setLinkedDesignId(linkData.designVersionId || null)
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkDesign = async (designId: string) => {
    setLinking(true)
    try {
      const res = await fetch('/api/admin/business/qr-link-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designVersionId: designId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to link design')
      }

      setLinkedDesignId(designId)
      setSuccessMessage('تم ربط التصميم مع رمز QR بنجاح')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل ربط التصميم')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">ربط تصميم برمز QR</h3>

      {successMessage && (
        <div className="mb-3 p-2 bg-green-50 text-green-700 border border-green-100 rounded text-sm">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 border border-red-100 rounded text-sm">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">لا توجد تصاميم محفوظة. الرجاء حفظ تصميم أولاً.</div>
      ) : (
        <div className="space-y-2">
          {designs.map((design) => (
            <div
              key={design.id}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                linkedDesignId === design.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => handleLinkDesign(design.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="qr-design"
                      checked={linkedDesignId === design.id}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{design.name}</span>
                    {linkedDesignId === design.id && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">مرتبط</span>
                    )}
                  </div>
                  {design.description && (
                    <p className="text-xs text-gray-600 mt-1 ml-6">{design.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-900">
        <p className="font-medium mb-1">ماذا يعني هذا؟</p>
        <p>
          عندما يقوم شخص بمسح رمز QR الخاص بك، سيشاهد القائمة بالتصميم المرتبط هنا. يمكنك تغيير التصميم في
          أي وقت دون الحاجة إلى طباعة رموز QR جديدة.
        </p>
      </div>
    </div>
  )
}
