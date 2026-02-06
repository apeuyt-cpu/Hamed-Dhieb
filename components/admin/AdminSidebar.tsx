'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

const navItems = [
  { href: '/admin', label: 'لوحة التحكم', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )},
  { href: '/admin/menu', label: 'القائمة', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )},
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin'
    return pathname.startsWith(path)
  }

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 bg-zinc-950 text-white flex-col border-l border-zinc-800/50" dir="rtl">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-5 border-b border-zinc-800/50 bg-white">
          <Image
            src="/logo.png"
            alt="Scaniha"
            width={120}
            height={40}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-5 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span className="text-zinc-300">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-zinc-800/50">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-base font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{loading ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50 shadow-lg" dir="rtl">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                isActive(item.href)
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <span className={isActive(item.href) ? 'text-orange-600' : 'text-zinc-500'}>
                {item.icon}
              </span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            disabled={loading}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              loading ? 'opacity-50' : 'text-zinc-500 hover:text-red-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-medium">خروج</span>
          </button>
        </div>
      </nav>
    </>
  )
}
