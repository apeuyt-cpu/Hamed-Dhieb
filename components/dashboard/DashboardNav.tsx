'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/admin"
              className={`flex items-center px-4 border-b-2 ${
                isActive('/admin') && pathname !== '/admin/menu' && pathname !== '/admin/theme' && pathname !== '/admin/qr'
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/menu"
              className={`flex items-center px-4 border-b-2 ${
                isActive('/admin/menu')
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Menu
            </Link>
            <Link
              href="/admin/theme"
              className={`flex items-center px-4 border-b-2 ${
                isActive('/admin/theme')
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Theme
            </Link>
            <Link
              href="/admin/qr"
              className={`flex items-center px-4 border-b-2 ${
                isActive('/admin/qr')
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              QR Code
            </Link>
            <Link
              href="/admin/settings"
              className={`flex items-center px-4 border-b-2 ${
                isActive('/admin/settings')
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </Link>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {loading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

