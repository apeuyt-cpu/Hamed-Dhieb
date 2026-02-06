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

export default function ThemeSection({ business }: { business: Business }) {
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

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Theme Settings</h2>
        <p className="text-gray-600">Choose a theme for your public menu</p>
      </div>
      <ThemeSelector 
        businessId={business.id} 
        currentThemeId={business.theme_id}
        themes={themes}
      />
    </div>
  )
}

