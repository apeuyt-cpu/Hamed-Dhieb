'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeSelector from '@/components/theme/ThemeSelector'
import type { Database } from '@/lib/supabase/database.types'

type Theme = Database['public']['Tables']['themes']['Row']

interface Business {
  id: string
  theme_id: string
}

export default function ThemeManager({ business }: { business: Business }) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchThemes()
  }, [])

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .order('id')

      if (error) throw error
      setThemes(data || [])
    } catch (err) {
      console.error('Error fetching themes:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Theme</h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <ThemeSelector 
            businessId={business.id} 
            currentThemeId={business.theme_id}
            themes={themes}
          />
        )}
      </div>
    </div>
  )
}

