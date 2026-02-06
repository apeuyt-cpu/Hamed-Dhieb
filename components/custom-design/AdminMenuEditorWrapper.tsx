"use client"
import React, { useEffect, useState } from 'react'
import AdvancedMenuEditor, { Design } from './AdvancedMenuEditor'
import DesignVersionManager from './DesignVersionManager'
import QRDesignLinker from './QRDesignLinker'

export default function AdminMenuEditorWrapper(){
  const [business, setBusiness] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [design, setDesign] = useState<Design | null>(null)
  const [initialDesign, setInitialDesign] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(()=>{ fetchBusiness() }, [])

  const fetchBusiness = async () => {
    try{
      const res = await fetch('/api/admin/business')
      if (!res.ok) throw new Error('Failed to load business')
      const data = await res.json()
      setBusiness(data)
      setDesign(data.design || null)
      setInitialDesign(data.design ? JSON.stringify(data.design) : null)
    }catch(err){ console.error(err) }
    finally{ setLoading(false) }
  }

  const isDirty = () => {
    const cur = design ? JSON.stringify(design) : null
    return cur !== initialDesign
  }

  const handleSave = async () => {
    if (!design) return
    setSaving(true)
    try{
      // NEW: Save to design-versions system instead of old business.design
      // This ensures the design is properly stored and can be linked to QR code
      const res = await fetch('/api/admin/business/design-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `Auto-Save ${new Date().toLocaleTimeString('ar-SA')}`,
          description: 'تم الحفظ التلقائي',
          design,
          setAsActive: true  // Auto-set as active so it displays immediately
        })
      })

      let json: any = null
      try { json = await res.json() } catch (e) { /* not JSON */ }

      if (!res.ok) {
        const message = json?.error || res.statusText || 'Save failed'
        console.error('Save failed:', res.status, message)
        // If unauthorized, redirect to login
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
          return
        }
        setSuccessMessage(`فشل الحفظ: ${message}`)
        window.setTimeout(()=> setSuccessMessage(null), 5000)
        return
      }

      if (json && json.success) {
        setSuccessMessage('تم حفظ التصميم بنجاح')
        setInitialDesign(JSON.stringify(design))
        
        // Auto-link the newly created design to QR code
        if (json.design && json.design.id) {
          try {
            await fetch('/api/admin/business/qr-link-design', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ designVersionId: json.design.id })
            })
          } catch (linkErr) {
            console.warn('Auto-link failed, but design was saved:', linkErr)
          }
        }
        
        if (json.design && json.design.updated_at) {
          setLastSaved(new Date(json.design.updated_at).toLocaleString('ar-SA'))
        }
        window.setTimeout(()=> setSuccessMessage(null), 4000)
      } else {
        setSuccessMessage('فشل الحفظ')
        window.setTimeout(()=> setSuccessMessage(null), 4000)
      }
    } catch(err){ console.error(err); setSuccessMessage('فشل الحفظ'); window.setTimeout(()=> setSuccessMessage(null), 4000) }
    finally{ setSaving(false) }
  }

  if (loading) return <div className="py-8">جاري التحميل...</div>
  if (!business) return <div className="py-8 text-red-600">لم يتم العثور على نشاط تجاري</div>

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold">محرر التصميم</h2>
          <div className="text-sm text-zinc-600">عدل مظهر قائمتك هنا. التغييرات غير محفوظة حتى تضغط حفظ.</div>
        </div>
        <div className="flex items-center gap-3">
          {successMessage && <div className="px-3 py-2 bg-green-50 text-green-700 border border-green-100 rounded">{successMessage}</div>}
          {lastSaved && <div className="text-sm text-zinc-500">آخر حفظ: {lastSaved}</div>}
          <button onClick={handleSave} disabled={saving || !isDirty()} className={`px-4 py-2 rounded ${saving || !isDirty() ? 'bg-zinc-300 text-zinc-600' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}>
            {saving ? 'جاري الحفظ...' : (isDirty() ? 'حفظ التصميم' : 'لا تغييرات')}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <AdvancedMenuEditor value={design ?? undefined} onChange={(d)=> setDesign(d)} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DesignVersionManager currentDesign={design} onDesignLoad={(d) => {
          setDesign(d)
          setInitialDesign(JSON.stringify(d))
        }} />
        <QRDesignLinker />
      </div>
    </div>
  )
}
