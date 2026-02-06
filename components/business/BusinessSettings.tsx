'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'

interface Business {
  id: string
  name: string
  slug: string
}

interface BusinessSettingsProps {
  business: Business
}

export default function BusinessSettings({ business: initialBusiness }: BusinessSettingsProps) {
  const [business, setBusiness] = useState(initialBusiness)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const [design, setDesign] = useState<any | null>(null)

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string

    try {
      const { error: updateError } = await (supabase
        .from('businesses') as any)
        .update({ name })
        .eq('id', business.id)

      if (updateError) throw updateError

      setBusiness({ ...business, name })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch design JSON for this business
    let mounted = true
    ;(async () => {
      try {
        const { data } = await (supabase.from('businesses') as any)
          .select('design')
          .eq('id', business.id)
          .maybeSingle()

        if (mounted && data) {
          setDesign(data.design || null)
        }
      } catch (err) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [business.id, supabase])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-6">Business Information</h2>
      
      <form onSubmit={handleUpdate} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={business.name}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Menu URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              defaultValue={`${typeof window !== 'undefined' ? window.location.origin : ''}/${business.slug}`}
              readOnly
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
            />
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`)
                  alert('URL copied!')
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Copy
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            Settings updated successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Design preview if exists */}
      {design && (
        <div className="mt-6 p-4 border rounded-lg bg-white">
          <h3 className="font-semibold mb-3">تصميم القائمة المحفوظ</h3>
              <div className="mb-3" style={{width: 360}}>
                    <div style={ design.backgroundImage ? { backgroundImage: `url(${design.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: 16, borderRadius: 8 } : {background: design.background || '#fff', color: design.accentColor || '#000', padding: 16, borderRadius: 8}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8}}>
                        {design.logo ? <img src={design.logo} alt="logo" style={{width: 56, height: 56, objectFit: 'contain'}} /> : null}
                        <div style={{fontWeight: 800, textAlign: 'center'}}>{design.headerTitle || 'قائمة'}</div>
                      </div>
                  <div>
                    {design.sections?.map((section: any, idx: number) => (
                      <div key={idx} style={{marginTop: 12}}>
                        <div style={{fontWeight: 700, marginBottom: 6}}>{section.title || section.name}</div>
                        {section.items?.map((it: any, i: number) => (
                          <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)'}}>
                            <div style={{fontSize: 14}}>{it.name}</div>
                            <div style={{fontSize: 13, color: '#444'}}>{it.price ? it.price : ''}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          <div>
            <button className="px-4 py-2 bg-cyan-600 text-white rounded" onClick={async () => {
              try {
                const dataUrl = await QRCode.toDataURL(JSON.stringify({ type: 'menu', business: business.slug }), { margin: 1, scale: 6 })
                const a = document.createElement('a')
                a.href = dataUrl
                a.download = `${business.slug}-menu-qr.png`
                a.click()
              } catch (err) {
                console.error(err)
              }
            }}>تحميل رمز QR</button>
          </div>
        </div>
      )}
    </div>
  )
}

