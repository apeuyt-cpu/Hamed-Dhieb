import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function CustomMenuEditor({ onChange }: { onChange?: (design: any) => void }) {
  const [background, setBackground] = useState('#ffffff')
  const [primaryColor, setPrimaryColor] = useState('#00bcd4')
  const [sections, setSections] = useState<Array<any>>([
    { name: 'قسم جديد', items: [{ name: 'منتج جديد', price: '' }] }
  ])
  const [qrSrc, setQrSrc] = useState<string | null>(null)

  useEffect(() => {
    if (onChange) onChange({ background, primaryColor, sections })
  }, [background, primaryColor, sections, onChange])

  const addSection = () => setSections([...sections, { name: 'قسم جديد', items: [] }])
  const updateSectionName = (idx: number, name: string) => {
    const updated = [...sections]
    updated[idx].name = name
    setSections(updated)
  }
  const addItem = (sectionIdx: number) => {
    const updated = [...sections]
    updated[sectionIdx].items.push({ name: '', price: '' })
    setSections(updated)
  }
  const updateItem = (sectionIdx: number, itemIdx: number, key: string, value: string) => {
    const updated = [...sections]
    updated[sectionIdx].items[itemIdx][key] = value
    setSections(updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-bold mb-1">لون الخلفية</label>
        <input type="color" value={background} onChange={e => setBackground(e.target.value)} />
      </div>

      <div>
        <label className="block font-bold mb-1">اللون الرئيسي</label>
        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
      </div>

      <div>
        <label className="block font-bold mb-2">الأقسام</label>
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-4 p-3 border rounded-xl bg-gray-50">
            <input
              className="mb-2 px-2 py-1 rounded border"
              value={section.name}
              onChange={e => updateSectionName(sIdx, e.target.value)}
              placeholder="اسم القسم"
            />
            <div className="space-y-2">
              {section.items.map((item: any, iIdx: number) => (
                <div key={iIdx} className="flex gap-2">
                  <input
                    className="px-2 py-1 rounded border flex-1"
                    value={item.name}
                    onChange={e => updateItem(sIdx, iIdx, 'name', e.target.value)}
                    placeholder="اسم المنتج"
                  />
                  <input
                    className="px-2 py-1 rounded border w-24"
                    value={item.price}
                    onChange={e => updateItem(sIdx, iIdx, 'price', e.target.value)}
                    placeholder="السعر"
                  />
                </div>
              ))}
              <button type="button" className="text-cyan-700 mt-2" onClick={() => addItem(sIdx)}>
                + إضافة منتج
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="text-cyan-700 font-bold" onClick={addSection}>
          + إضافة قسم
        </button>
      </div>

      {/* Live Preview */}
      <div>
        <h4 className="font-semibold mb-3">معاينة مباشرة</h4>
        <div className="rounded-xl overflow-hidden border" style={{ width: 360, margin: '0 auto' }}>
          <div
            style={{
              background: background,
              color: primaryColor === '#ffffff' ? '#000' : '#fff',
              padding: 20,
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}>{'اسم مطعمي'}</div>
            <div style={{ flex: 1 }}>
              {sections.map((section, sIdx) => (
                <div key={sIdx} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{section.name}</div>
                  <div>
                    {section.items.map((item: any, iIdx: number) => (
                      <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.95 }}>
                        <div>{item.name || '—'}</div>
                        <div>{item.price ? item.price + ' د.ت' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code generation */}
      <div className="mt-4">
        <h4 className="font-semibold mb-2">رمز QR للمعاينة</h4>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg"
            onClick={async () => {
              try {
                const payload = {
                  type: 'menu-preview',
                  background,
                  primaryColor,
                  sections,
                }
                const data = JSON.stringify(payload)
                const dataUrl = await QRCode.toDataURL(data, { margin: 1, scale: 6 })
                setQrSrc(dataUrl)
              } catch (e) {
                console.error(e)
              }
            }}
          >
            أنشئ رمز QR
          </button>

          {qrSrc && (
            <div className="flex items-center gap-3">
              <img src={qrSrc} alt="QR" width={88} height={88} className="rounded-md border" />
              <a href={qrSrc} download="menu-preview-qr.png" className="px-3 py-2 bg-white border rounded-md text-cyan-700">
                تحميل
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
