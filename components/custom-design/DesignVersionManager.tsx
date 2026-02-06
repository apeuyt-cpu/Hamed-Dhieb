'use client'

import React, { useState, useEffect } from 'react'
import { Design } from './AdvancedMenuEditor'

interface DesignVersion {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function DesignVersionManager({
  currentDesign,
  onDesignLoad,
}: {
  currentDesign: Design | null
  onDesignLoad: (design: Design) => void
}) {
  const [designs, setDesigns] = useState<DesignVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveDialogName, setSaveDialogName] = useState('')
  const [saveDialogDescription, setSaveDialogDescription] = useState('')
  const [setAsActive, setSetAsActive] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDesigns()
  }, [])

  const fetchDesigns = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/business/design-versions')
      if (!res.ok) {
        let errMsg = 'فشل تحميل التصاميم'
        try {
          const errData = await res.json()
          if (res.status === 401) {
            // Not authorized - redirect to login
            window.location.href = '/login'
            return
          }
          errMsg = errData?.error || errMsg
          console.error('Designs API error:', res.status, errData)
        } catch (parseErr) {
          console.error('Failed to parse designs error response', parseErr)
        }
        throw new Error(errMsg)
      }
      const data = await res.json()
      console.log('=== fetchDesigns: Raw API response ===', data)
      
      // Ensure all designs have valid IDs
      const designsWithIds = (data.designs || []).filter((design: any, index: number) => {
        console.log(`Design ${index}:`, design)
        console.log(`Design ${index} - id:`, design.id)
        console.log(`Design ${index} - id type:`, typeof design.id)
        console.log(`Design ${index} - has id:`, !!design.id)
        
        if (!design.id) {
          console.warn(`Design ${index} missing ID:`, design)
          return false
        }
        return true
      })
      
      console.log('=== fetchDesigns: After filtering ===', designsWithIds)
      console.log('=== fetchDesigns: Setting state with designs count ===', designsWithIds.length)
      setDesigns(designsWithIds as DesignVersion[])
    } catch (err) {
      console.error('fetchDesigns error:', err)
      setErrorMessage('فشل تحميل التصاميم')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDesign = async () => {
    if (!currentDesign || !saveDialogName.trim()) {
      setErrorMessage('الرجاء إدخال اسم للتصميم')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/business/design-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveDialogName.trim(),
          description: saveDialogDescription.trim(),
          design: currentDesign,
          setAsActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save design')
      }

      setSuccessMessage('تم حفظ التصميم بنجاح')
      setSaveDialogName('')
      setSaveDialogDescription('')
      setSetAsActive(false)
      setShowSaveDialog(false)
      fetchDesigns()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل حفظ التصميم')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleLoadDesign = async (designId: string) => {
    console.log('=== handleLoadDesign START ===')
    console.log('designId parameter:', designId)
    console.log('designId type:', typeof designId)
    console.log('designId is nullish:', !designId)
    
    try {
      // Validate designId before making the request
      if (!designId || designId === 'undefined' || typeof designId !== 'string') {
        const errorMsg = `Design ID is invalid or missing. Received: ${JSON.stringify(designId)}`
        console.error(errorMsg)
        throw new Error(errorMsg)
      }
      
      const url = `/api/admin/business/design-versions/${designId}`
      console.log('Fetching from URL:', url)
      
      const res = await fetch(url)
      console.log('API Response status:', res.status)
      console.log('API Response ok:', res.ok)
      
      if (!res.ok) {
        let errMsg = 'Failed to load design'
        let errData = null
        try {
          errData = await res.json()
          console.log('API Error response body:', errData)
          errMsg = errData?.error || errMsg
        } catch (parseErr) {
          console.error('Failed to parse error response:', parseErr)
          console.error('Raw response:', res)
        }
        throw new Error(errMsg)
      }
      
      const data = await res.json()
      console.log('API Response data:', data)
      
      // Validate the response structure
      if (!data.design) {
        throw new Error('Invalid response: missing design data')
      }
      
      // Extract the actual design object
      const designData = data.design.design || data.design
      console.log('Design data to load:', designData)
      
      if (!designData || typeof designData !== 'object') {
        throw new Error('Invalid design data format')
      }
      
      onDesignLoad(designData)
      
      setSuccessMessage('تم تحميل التصميم بنجاح')
      setTimeout(() => setSuccessMessage(null), 3000)
      console.log('=== handleLoadDesign SUCCESS ===')
    } catch (err: any) {
      console.error('=== handleLoadDesign ERROR ===')
      console.error('Error:', err)
      console.error('Error message:', err.message)
      setErrorMessage(err.message || 'فشل تحميل التصميم')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleSetAsActive = async (designId: string) => {
    try {
      // Validate designId
      if (!designId || designId === 'undefined' || typeof designId !== 'string') {
        throw new Error('Design ID is invalid or missing')
      }
      
      const res = await fetch(`/api/admin/business/design-versions/${designId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAsActive: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to set active design')
      }
      
      setSuccessMessage('تم تعيين التصميم كنشط')
      fetchDesigns()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تعيين التصميم')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleDeleteDesign = async (designId: string) => {
    // Validate designId first
    if (!designId || designId === 'undefined' || typeof designId !== 'string') {
      setErrorMessage('Design ID is invalid or missing')
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }
    
    if (!confirm('هل أنت متأكد من حذف هذا التصميم؟')) return

    try {
      const res = await fetch(`/api/admin/business/design-versions/${designId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete design')
      }

      setSuccessMessage('تم حذف التصميم بنجاح')
      fetchDesigns()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل حذف التصميم')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleImportDesign = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedData = JSON.parse(text)

      if (!importedData.design || typeof importedData.design !== 'object') {
        throw new Error('ملف التصميم غير صحيح')
      }

      setSaveDialogName(importedData.name || 'تصميم مستورد')
      setSaveDialogDescription(importedData.description || '')
      onDesignLoad(importedData.design)
      setShowSaveDialog(true)
      setSuccessMessage('تم تحميل الملف بنجاح. الآن احفظه باسم جديد.')
    } catch (err: any) {
      setErrorMessage(
        err.message === 'ملف التصميم غير صحيح'
          ? err.message
          : 'فشل تحميل الملف. تأكد من أنه ملف تصميم صحيح.'
      )
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    setTimeout(() => setErrorMessage(null), 4000)
  }

  const handleExportDesign = (design: DesignVersion & { design?: Design }) => {
    const designData = { ...design }
    const dataStr = JSON.stringify(designData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${design.name.replace(/\s+/g, '_')}_${design.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">مدير التصاميم</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={!currentDesign}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
            >
              حفظ التصميم الحالي
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              استيراد تصميم
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportDesign}
              style={{ display: 'none' }}
            />
          </div>
        </div>

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
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">حفظ تصميم جديد</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">اسم التصميم *</label>
              <input
                type="text"
                value={saveDialogName}
                onChange={(e) => setSaveDialogName(e.target.value)}
                placeholder="مثل: ديكور الخريف"
                className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">وصف (اختياري)</label>
              <textarea
                value={saveDialogDescription}
                onChange={(e) => setSaveDialogDescription(e.target.value)}
                placeholder="وصف قصير للتصميم"
                rows={3}
                className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="setAsActive"
                checked={setAsActive}
                onChange={(e) => setSetAsActive(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="setAsActive" className="ml-2 text-sm">
                تعيين كتصميم نشط
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveDesign}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setSaveDialogName('')
                  setSaveDialogDescription('')
                  setSetAsActive(false)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Designs List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">جاري تحميل التصاميم...</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">لا توجد تصاميم محفوظة</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-auto">
          {designs.map((design, mapIndex) => {
            console.log(`=== Rendering design ${mapIndex} ===`, design)
            console.log(`Design ${mapIndex} has id:`, !!design.id, 'value:', design.id)
            return (
            <div key={design.id || `design-${mapIndex}`} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{design.name}</span>
                  {design.is_active && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">نشط</span>
                  )}
                </div>
                {design.description && (
                  <p className="text-xs text-gray-600 mt-1">{design.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(design.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>

              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => {
                    console.log('=== LOAD BUTTON CLICKED ===')
                    console.log('design object:', design)
                    console.log('design keys:', Object.keys(design))
                    console.log('design.id:', design.id)
                    console.log('design.id type:', typeof design.id)
                    console.log('All design values:', JSON.stringify(design))
                    handleLoadDesign(design.id)
                  }}
                  className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                  title="تحميل التصميم"
                >
                  تحميل
                </button>
                {!design.is_active && (
                  <button
                    onClick={() => handleSetAsActive(design.id)}
                    className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"
                    title="تعيين كنشط"
                  >
                    تفعيل
                  </button>
                )}
                <button
                  onClick={() => handleExportDesign(design as any)}
                  className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100"
                  title="تصدير التصميم"
                >
                  تصدير
                </button>
                {!design.is_active && (
                  <button
                    onClick={() => handleDeleteDesign(design.id)}
                    className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                    title="حذف التصميم"
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
