'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import LogoUpload from '@/components/business/LogoUpload'
import SettingsManager from '@/components/admin/SettingsManager'

interface Business {
  id: string
  name: string
  slug: string
  theme_id: string
  status: 'active' | 'paused'
  logo_url: string | null
  expires_at: string | null
  primary_color: string | null
}

export default function AdminDashboard() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchBusiness()
  }, [])

  useEffect(() => {
    if (business?.slug) {
      generateQR()
      setActiveTheme(business.theme_id)
    }
  }, [business?.slug])

  // Countdown timer
  useEffect(() => {
    if (!business?.expires_at) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiry = new Date(business.expires_at!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [business?.expires_at])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/admin/business')
      
      // Check if response is OK and is JSON
      if (res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json()
          setBusiness(data)
        } else {
          // Response is not JSON (likely HTML redirect or error page)
          console.error('Error fetching business: Response is not JSON')
          // Try to reload the page to handle redirects
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      } else {
        // Handle non-OK responses
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json()
          console.error('Error fetching business:', errorData.error || 'Unknown error')
        } else {
          console.error('Error fetching business: HTTP', res.status)
          // If unauthorized, redirect to login
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      }
    } catch (err) {
      console.error('Error fetching business:', err)
      // If it's a JSON parse error, it means we got HTML instead of JSON
      if (err instanceof SyntaxError && err.message.includes('JSON')) {
        console.error('Received HTML instead of JSON - possible redirect or error page')
        // Try to reload to handle redirects
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  const generateQR = async () => {
    if (!business?.slug) return
    try {
      const menuUrl = `${window.location.origin}/${business.slug}`
      const dataUrl = await QRCode.toDataURL(menuUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#18181b', light: '#FFFFFF' }
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('QR error:', err)
    }
  }

  const handleThemeChange = async (themeId: string) => {
    try {
      await (supabase.from('businesses') as any)
        .update({ theme_id: themeId })
        .eq('id', business?.id)
      setActiveTheme(themeId)
      fetchBusiness()
    } catch (err) {
      console.error('Theme update error:', err)
    }
  }

  const copyUrl = () => {
    if (!business) return
    navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    if (!qrDataUrl || !business) return
    const link = document.createElement('a')
    link.download = `${business.slug}-qr.png`
    link.href = qrDataUrl
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-zinc-500">لم يتم العثور على نشاط تجاري</p>
        </div>
      </div>
    )
  }

  const menuUrl = `${window.location.origin}/${business.slug}`
  const themes = [
    { id: 'classic', name: 'كلاسيكي', color: '#8B2635', bg: '#FFFDF9' },
    { id: 'dark', name: 'داكن', color: '#D4AF37', bg: '#0A0A0A' },
    { id: 'minimal', name: 'بسيط', color: '#E85D04', bg: '#F7F7F5' },
  ]

  const isExpired = countdown && countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0
  const isUrgent = countdown && countdown.days <= 3

  return (
    <>
      <style jsx>{`
        @keyframes pulse-urgent {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .pulse-urgent {
          animation: pulse-urgent 1s infinite;
        }
      `}</style>
      
      <div className="admin-page p-4 lg:p-8 max-w-6xl mx-auto" dir="rtl">
        {/* Countdown Banner */}
        {countdown && (
          <div className={`mb-6 rounded-2xl p-4 lg:p-6 ${
            isExpired 
              ? 'bg-red-500 text-white' 
              : isUrgent 
                ? 'bg-amber-500 text-white pulse-urgent' 
                : 'bg-gradient-to-l from-blue-500 to-blue-600 text-white'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">
                  {isExpired ? '⚠️ انتهى الاشتراك' : isUrgent ? '⚠️ الاشتراك على وشك الانتهاء' : '⏰ الوقت المتبقي'}
                </h3>
                <p className="text-sm opacity-90">
                  {isExpired 
                    ? 'القائمة الخاصة بك متوقفة. تواصل مع المشرف لتجديد الاشتراك.'
                    : 'تواصل مع المشرف قبل انتهاء الوقت'
                  }
                </p>
              </div>
              
              {!isExpired && (
                <div className="flex gap-3 text-center">
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.days}</div>
                    <div className="text-xs opacity-80">يوم</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.hours}</div>
                    <div className="text-xs opacity-80">ساعة</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.minutes}</div>
                    <div className="text-xs opacity-80">دقيقة</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.seconds}</div>
                    <div className="text-xs opacity-80">ثانية</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {business.logo_url ? (
              <img 
                src={business.logo_url} 
                alt="" 
                className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl object-cover border border-zinc-200"
              />
            ) : (
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-400 text-xl font-medium">
                {business.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-zinc-900">{business.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${business.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-sm lg:text-base text-zinc-500">
                  {business.status === 'active' ? 'نشط' : 'متوقف'}
                </span>
              </div>
            </div>
          </div>
          
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-900 text-white text-sm lg:text-base font-medium rounded-xl hover:bg-zinc-800 transition-colors"
          >
            عرض القائمة ←
          </a>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* Menu Builder Card */}
          <Link
            href="/admin/menu"
            className="group bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-zinc-400 group-hover:text-zinc-600 transition-colors text-xl">←</span>
            </div>
            <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-1">منشئ القائمة</h3>
            <p className="text-zinc-500 text-sm lg:text-base">إضافة الفئات والعناصر</p>
          </Link>

          {/* QR Code Card */}
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-1">رمز QR</h3>
                <p className="text-zinc-500 text-sm lg:text-base mb-4">امسح لفتح القائمة</p>
                <button
                  onClick={downloadQR}
                  disabled={!qrDataUrl}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm lg:text-base font-medium rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  تحميل
                </button>
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR" className="w-24 h-24 lg:w-28 lg:h-28 rounded-xl" />
              )}
            </div>
          </div>

          {/* Menu URL Card */}
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200">
            <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-1">رابط القائمة</h3>
            <p className="text-zinc-500 text-sm lg:text-base mb-4">شارك مع العملاء</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm lg:text-base bg-zinc-100 px-3 py-2 rounded-xl text-zinc-600 truncate" dir="ltr">
                /{business.slug}
              </code>
              <button
                onClick={copyUrl}
                className={`px-4 py-2 text-sm lg:text-base font-medium rounded-xl transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {copied ? '✓' : 'نسخ'}
              </button>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200 mb-5">
          <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-4">المظهر</h3>
          <div className="flex gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  activeTheme === theme.id
                    ? 'border-zinc-900 shadow-md'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div 
                  className="h-10 lg:h-12 rounded-lg mb-3 flex items-center justify-center"
                  style={{ backgroundColor: theme.bg }}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />
                </div>
                <p className="text-sm lg:text-base font-medium text-zinc-700 text-center">{theme.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Manager - Full Component */}
        <SettingsManager business={business} onUpdate={fetchBusiness} />
      </div>
    </>
  )
}

function StatusToggle({ 
  businessId, 
  status, 
  onUpdate 
}: { 
  businessId: string
  status: 'active' | 'paused'
  onUpdate: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const toggle = async () => {
    setLoading(true)
    try {
      await (supabase.from('businesses') as any)
        .update({ status: status === 'active' ? 'paused' : 'active' })
        .eq('id', businessId)
      onUpdate()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        status === 'active' ? 'bg-green-500' : 'bg-zinc-300'
      } ${loading ? 'opacity-50' : ''}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          status === 'active' ? 'right-1' : 'right-7'
        }`}
      />
    </button>
  )
}
