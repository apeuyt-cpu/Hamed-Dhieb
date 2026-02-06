"use client"
import React, { useEffect, useState } from "react"
import QRCode from "qrcode"

type MenuItem = {
  id: string
  name: string
  price?: string
  description?: string
  image?: string // base64 or url
}

type Section = {
  id: string
  title: string
  items: MenuItem[]
}

export type Design = {
  headerTitle: string
  background: string
  backgroundImage?: string
  accentColor: string
  logo?: string
  fontFamily: string
  layout: "grid" | "list" | "card" | "modern"
  sections: Section[]
}

function uid(prefix = "id") { return prefix + "_" + Math.random().toString(36).slice(2,9) }

export default function AdvancedMenuEditor({
  value,
  onChange,
}:{
  value?: Design
  onChange?: (d: Design)=>void
}){
  const [design, setDesign] = useState<Design>(() => value ?? {
    headerTitle: "قائمة الطعام",
    background: "#ffffff",
    accentColor: "#06b6d4",
    fontFamily: "Inter, system-ui, sans-serif",
    layout: "modern",
    sections: [
      { id: uid('sec'), title: "مشروبات", items: [ { id: uid('it'), name: "عصير طازج", price: "5 دت", description: "عصير طبيعي", image: "" } ] }
    ]
  })
  
  useEffect(()=>{ onChange?.(design) }, [design])

  const update = (patch: Partial<Design>) => setDesign(d => ({ ...d, ...patch }))
  
  const addSection = () => setDesign(d => ({ ...d, sections: [...d.sections, { id: uid('sec'), title: "قسم جديد", items: [] }] }))
  const removeSection = (id:string) => setDesign(d => ({ ...d, sections: d.sections.filter(s=>s.id!==id) }))

  const addItem = (secId:string) => setDesign(d => ({ ...d, sections: d.sections.map(s => s.id===secId ? { ...s, items: [...s.items, { id: uid('it'), name: "عنصر جديد", price: "", description: "", image: "" }] } : s) }))
  const updateItem = (secId:string, itemId:string, patch: Partial<MenuItem>) => setDesign(d => ({ ...d, sections: d.sections.map(s => s.id===secId ? { ...s, items: s.items.map(it => it.id===itemId ? { ...it, ...patch } : it) } : s) }))
  const removeItem = (secId:string, itemId:string) => setDesign(d => ({ ...d, sections: d.sections.map(s => s.id===secId ? { ...s, items: s.items.filter(it=>it.id!==itemId) } : s) }))

  const uploadImage = (file: File, cb: (b64:string)=>void) => {
    const r = new FileReader()
    r.onload = ()=>{ cb(String(r.result)) }
    r.readAsDataURL(file)
  }

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const generateQR = async () => {
    try {
      // Create minimal design data for QR code (very small payload)
      const minimalDesign = {
        title: design.headerTitle,
        bg: design.background,
        color: design.accentColor,
        font: design.fontFamily,
        layout: design.layout,
        sections: design.sections.map(s => ({
          title: s.title,
          count: s.items.length
        }))
      }
      const data = await QRCode.toDataURL(JSON.stringify(minimalDesign), { margin: 1 })
      setQrDataUrl(data)
    } catch (e) {
      console.error('Failed to generate QR code:', e)
      alert('Unable to generate QR code: Design is too complex. Consider simplifying your menu structure.')
    }
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-1/3 bg-white p-4 rounded shadow sticky top-20 max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-2">إعدادات التصميم</h3>
        <label className="block text-sm">عنوان الرأس</label>
        <input aria-label="عنوان الرأس" value={design.headerTitle} onChange={e=>update({ headerTitle: e.target.value })} className="w-full p-2 border rounded mb-2" />

        <label className="block text-sm mt-2">شعار القائمة (Logo)</label>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-16 h-16 bg-gray-50 rounded flex items-center justify-center overflow-hidden border">
            {design.logo ? <img src={design.logo} alt="logo" className="w-full h-full object-contain" /> : <div className="text-xs text-zinc-400">لا يوجد</div>}
          </div>
          <div className="flex flex-col">
            <input type="file" accept="image/*" onChange={e=>{ const f = e.target.files?.[0]; if(f) uploadImage(f, b64=> update({ logo: b64 })) }} />
            {design.logo && <button className="text-sm text-red-600 mt-2" onClick={()=> update({ logo: '' })}>إزالة الشعار</button>}
          </div>
        </div>

        <label className="block text-sm">خلفية (لون أو رابط)</label>
        <input aria-label="خلفية" value={design.background} onChange={e=>update({ background: e.target.value })} className="w-full p-2 border rounded mb-2" />

        <label className="block text-sm mt-2">خلفية بصورة (اختياري)</label>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-24 h-16 bg-gray-50 rounded flex items-center justify-center overflow-hidden border">
            {design.backgroundImage ? <img src={design.backgroundImage} alt="background" className="w-full h-full object-cover"/> : <div className="text-xs text-zinc-400">لا توجد</div>}
          </div>
          <div className="flex flex-col">
            <input type="file" accept="image/*" onChange={e=>{ const f = e.target.files?.[0]; if(f) uploadImage(f, b64=> update({ backgroundImage: b64 })) }} />
            {design.backgroundImage && <button className="text-sm text-red-600 mt-2" onClick={()=> update({ backgroundImage: '' })}>إزالة الخلفية</button>}
          </div>
        </div>

        <label className="block text-sm">لون مميز</label>
        <input aria-label="لون مميز" value={design.accentColor} onChange={e=>update({ accentColor: e.target.value })} className="w-full p-2 border rounded mb-2" />

        <label className="block text-sm">خط</label>
        <select aria-label="خط" value={design.fontFamily} onChange={e=>update({ fontFamily: e.target.value })} className="w-full p-2 border rounded mb-2">
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="'Scheherazade New', serif">Scheherazade New</option>
          <option value="'Noto Naskh Arabic', serif">Noto Naskh Arabic</option>
        </select>

        <label className="block text-sm">التخطيط</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          <button className={`p-2 border rounded ${design.layout==='grid'?'bg-gray-100':''}`} onClick={()=>update({ layout:'grid' })} aria-pressed={design.layout==='grid'}>شبكة</button>
          <button className={`p-2 border rounded ${design.layout==='list'?'bg-gray-100':''}`} onClick={()=>update({ layout:'list' })} aria-pressed={design.layout==='list'}>قائمة</button>
          <button className={`p-2 border rounded ${design.layout==='card'?'bg-gray-100':''}`} onClick={()=>update({ layout:'card' })} aria-pressed={design.layout==='card'}>بطاقات</button>
          <button className={`p-2 border rounded ${design.layout==='modern'?'bg-gray-100':''}`} onClick={()=>update({ layout:'modern' })} aria-pressed={design.layout==='modern'}>حديث</button>
        </div>

        <hr className="my-3" />
        <div className="flex justify-between items-center mb-2">
          <strong>الأقسام</strong>
          <button onClick={addSection} className="text-sm text-blue-600">إضافة قسم</button>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-auto">
          {design.sections.map(sec=> (
            <div key={sec.id} className="p-2 border rounded">
              <div className="flex justify-between items-center">
                <input className="p-1 border rounded" value={sec.title} onChange={e=> setDesign(d=> ({ ...d, sections: d.sections.map(s=> s.id===sec.id?{...s, title:e.target.value}:s) })) } />
                <div className="flex gap-1">
                  <button className="text-sm text-red-600" onClick={()=>removeSection(sec.id)}>حذف</button>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {sec.items.map(it=> (
                  <div key={it.id} className="p-2 border rounded bg-gray-50">
                    <input className="w-full p-1 border rounded mb-1" value={it.name} onChange={e=>updateItem(sec.id, it.id, { name: e.target.value })} />
                    <input className="w-full p-1 border rounded mb-1" placeholder="السعر" value={it.price} onChange={e=>updateItem(sec.id, it.id, { price: e.target.value })} />
                    <textarea className="w-full p-1 border rounded mb-1" rows={2} value={it.description} onChange={e=>updateItem(sec.id, it.id, { description: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*" onChange={e=>{ const f = e.target.files?.[0]; if(f) uploadImage(f, b64=> updateItem(sec.id, it.id, { image: b64 })) }} />
                      <button className="text-sm text-red-600" onClick={()=>removeItem(sec.id, it.id)}>حذف</button>
                    </div>
                  </div>
                ))}
                <div className="text-right">
                  <button onClick={()=>addItem(sec.id)} className="text-sm text-blue-600">إضافة عنصر</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={generateQR}>إنشاء رمز QR</button>
          {qrDataUrl && <a className="ml-2 text-sm text-blue-700" href={qrDataUrl} download="menu-qr.png">تحميل QR</a>}
        </div>
      </aside>

      <main className="lg:w-2/3 p-4">
        <div className="flex justify-center">
          <div className="relative bg-black rounded-3xl p-2 shadow-2xl">
            <div className="bg-white rounded-2xl overflow-hidden" style={{ width: '375px', height: '667px' }}>
              <div className="p-6 h-full overflow-auto" style={ design.backgroundImage ? { backgroundImage: `url(${design.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: design.background }}>
                <div style={{ fontFamily: design.fontFamily }}>
                  <header className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {design.logo ? <img src={design.logo} alt="logo" className="w-12 h-12 object-contain rounded" /> : <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs">شعار</div>}
                      <h1 className="text-2xl font-bold" style={{ color: design.accentColor }}>{design.headerTitle}</h1>
                    </div>
                  </header>

                  <div className="space-y-6">
                    {design.sections.map(sec=> (
                      <section key={sec.id}>
                        <h2 className="text-xl font-semibold mb-4" style={{ color: design.accentColor }}>{sec.title}</h2>
                        {design.layout === 'list' && (
                          <div className="space-y-3">
                            {sec.items.map(it=> (
                              <div key={it.id} className="flex gap-3 p-3 bg-white rounded-lg shadow">
                                {it.image ? <img src={it.image} className="w-16 h-16 object-cover rounded" alt=""/> : <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs">صورة</div>}
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-bold">{it.name}</h3>
                                    <div className="text-sm font-semibold" style={{ color: design.accentColor }}>{it.price}</div>
                                  </div>
                                  <p className="text-sm text-gray-600">{it.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {design.layout === 'grid' && (
                          <div className="grid grid-cols-2 gap-4">
                            {sec.items.map(it=> (
                              <div key={it.id} className="p-4 bg-white rounded-lg shadow">
                                {it.image ? <img src={it.image} className="w-full h-24 object-cover rounded mb-2" alt=""/> : <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-xs">صورة</div>}
                                <h3 className="font-bold text-sm">{it.name}</h3>
                                <div className="text-sm font-semibold" style={{ color: design.accentColor }}>{it.price}</div>
                                <p className="text-xs text-gray-600">{it.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {design.layout === 'card' && (
                          <div className="grid grid-cols-1 gap-4">
                            {sec.items.map(it=> (
                              <div key={it.id} className="p-4 bg-white rounded-xl shadow-lg border">
                                {it.image ? <img src={it.image} className="w-full h-32 object-cover rounded-lg mb-3" alt=""/> : <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-xs">صورة</div>}
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-bold text-lg">{it.name}</h3>
                                  <div className="text-lg font-bold" style={{ color: design.accentColor }}>{it.price}</div>
                                </div>
                                <p className="text-sm text-gray-700">{it.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {design.layout === 'modern' && (
                          <div className="space-y-4">
                            {sec.items.map(it=> (
                              <div key={it.id} className="flex gap-4 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                                {it.image ? <img src={it.image} className="w-20 h-20 object-cover rounded-xl" alt=""/> : <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-xs">صورة</div>}
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg mb-1">{it.name}</h3>
                                  <p className="text-sm text-gray-600 mb-2">{it.description}</p>
                                  <div className="text-lg font-bold" style={{ color: design.accentColor }}>{it.price}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
