'use client'

import { Design } from '@/components/custom-design/AdvancedMenuEditor'

/**
 * CustomMenuViewer - Displays a custom design-based menu
 * 
 * FLOW WHEN USER CLICKS "عرض القائمة ←":
 * 1. WelcomeScreen splash hides
 * 2. PublicMenu component checks if business.design exists
 * 3. This component receives the design (loaded from database in [slug]/page.tsx)
 * 4. Renders the custom design with all its styling, colors, and layout
 * 
 * DATA SOURCE:
 * - Design is loaded from design_versions table if qr_design_version_id is set
 * - Falls back to business.design column if no specific version is linked
 * - This happens on the server side in [slug]/page.tsx via getBusinessDesignForDisplay()
 */
interface CustomMenuViewerProps {
  design: Design
  business: any
}

export default function CustomMenuViewer({ design, business }: CustomMenuViewerProps) {
  return (
    <div className="min-h-screen" style={{ background: design.backgroundImage ? `url(${design.backgroundImage})` : design.background, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="container mx-auto px-4 py-8">
        <div style={{ fontFamily: design.fontFamily }}>
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {design.logo ? <img src={design.logo} alt="logo" className="w-16 h-16 object-contain rounded" /> : <div className="w-16 h-16 bg-white/60 rounded flex items-center justify-center">شعار</div>}
              <h1 className="text-4xl font-bold" style={{ color: design.accentColor }}>{design.headerTitle}</h1>
            </div>
            {business.logo_url && <img src={business.logo_url} alt="business logo" className="w-16 h-16 object-contain" />}
          </header>

          <div className="space-y-8">
            {design.sections.map(sec => (
              <section key={sec.id}>
                <h2 className="text-2xl font-semibold mb-4" style={{ color: design.accentColor }}>{sec.title}</h2>
                {design.layout === 'list' && (
                  <div className="space-y-4">
                    {sec.items.map(it => (
                      <div key={it.id} className="flex gap-4 p-4 bg-white rounded-lg shadow">
                        {it.image ? <img src={it.image} className="w-20 h-20 object-cover rounded" alt="" /> : <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">صورة</div>}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg">{it.name}</h3>
                            <div className="text-lg font-semibold" style={{ color: design.accentColor }}>{it.price}</div>
                          </div>
                          <p className="text-gray-600">{it.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {design.layout === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sec.items.map(it => (
                      <div key={it.id} className="p-4 bg-white rounded-lg shadow">
                        {it.image ? <img src={it.image} className="w-full h-32 object-cover rounded mb-3" alt="" /> : <div className="w-full h-32 bg-gray-100 rounded mb-3 flex items-center justify-center">صورة</div>}
                        <h3 className="font-bold text-lg mb-1">{it.name}</h3>
                        <div className="text-lg font-semibold mb-2" style={{ color: design.accentColor }}>{it.price}</div>
                        <p className="text-gray-600">{it.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                {design.layout === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sec.items.map(it => (
                      <div key={it.id} className="p-6 bg-white rounded-xl shadow-lg border">
                        {it.image ? <img src={it.image} className="w-full h-40 object-cover rounded-lg mb-4" alt="" /> : <div className="w-full h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">صورة</div>}
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-xl">{it.name}</h3>
                          <div className="text-xl font-bold" style={{ color: design.accentColor }}>{it.price}</div>
                        </div>
                        <p className="text-gray-700">{it.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                {design.layout === 'modern' && (
                  <div className="space-y-6">
                    {sec.items.map(it => (
                      <div key={it.id} className="flex gap-6 p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                        {it.image ? <img src={it.image} className="w-24 h-24 object-cover rounded-xl" alt="" /> : <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">صورة</div>}
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-2">{it.name}</h3>
                          <p className="text-gray-600 mb-3">{it.description}</p>
                          <div className="text-xl font-bold" style={{ color: design.accentColor }}>{it.price}</div>
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
  )
}