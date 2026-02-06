"use client"
import React, { useEffect, useState } from 'react'

/**
 * WelcomeScreen - Shows a splash screen with business logo and name
 * 
 * CUSTOM DESIGN FEATURE:
 * - Uses the design from business.design (which is loaded from design_versions table if qr_design_version_id is set)
 * - Displays the design's logo, headerTitle, and background
 * - When user clicks "عرض القائمة ←", the custom design appears in the menu
 */
export default function WelcomeScreen({ business, children }: { business: any, children: React.ReactNode }){
  const [seen, setSeen] = useState<boolean>(true)

  useEffect(()=>{
    try{
      const key = `welcome_seen_${business.slug}`
      const v = sessionStorage.getItem(key)
      setSeen(!!v)
    }catch(e){ setSeen(true) }
  }, [business.slug])

  const dismiss = () => {
    try{ sessionStorage.setItem(`welcome_seen_${business.slug}`, '1') }catch(e){}
    setSeen(true)
  }

  if (seen) return <>{children}</>

  // Use custom design values if available
  // The design is already loaded from the database in [slug]/page.tsx
  const design = business.design
  const logo = design?.logo || business.logo_url
  const name = design?.headerTitle || business.name
  const background = design?.background || '#ffffff'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background }}>
      <style>{`
        @keyframes pulseScale { 0%{ transform: scale(0.9); opacity:0.9 } 50%{ transform: scale(1.02); opacity:1 } 100%{ transform: scale(0.95); opacity:0.95 } }
      `}</style>
      <div className="max-w-lg mx-auto text-center p-6">
        <div className="flex items-center justify-center mb-6">
          {logo ? (
            <img src={logo} alt={name} className="w-40 h-40 object-contain rounded-full shadow-lg" style={{ animation: 'pulseScale 2.2s ease-in-out infinite' }} />
          ) : (
            <div className="w-40 h-40 rounded-full bg-zinc-100 flex items-center justify-center text-xl font-bold">{name}</div>
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-3">مرحبا بكم في {name}</h2>
        <p className="text-zinc-600 mb-6">اضغط على الشعار للدخول إلى القائمة الرقمية</p>

        <div className="flex justify-center gap-3">
          <button onClick={dismiss} className="px-6 py-3 bg-cyan-600 text-white rounded-lg shadow">عرض القائمة</button>
        </div>
      </div>
    </div>
  )
}
