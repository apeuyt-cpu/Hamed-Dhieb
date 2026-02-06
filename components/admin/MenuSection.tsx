'use client'

import { useState, useEffect } from 'react'
import ModernMenuBuilder from '@/components/menu/ModernMenuBuilder'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

export default function MenuSection({ businessId }: { businessId: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [businessId])

  const fetchCategories = async () => {
    try {
      const { data: cats, error } = await supabase
        .from('categories')
        .select(`
          *,
          items (*)
        `)
        .eq('business_id', businessId)
        .order('position', { ascending: true })

      if (error) throw error
      setCategories((cats || []) as Category[])
    } catch (err) {
      console.error('Error fetching categories:', err)
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu Builder</h2>
        <p className="text-gray-600">Organize your menu by creating categories and adding items</p>
      </div>
      <ModernMenuBuilder businessId={businessId} initialCategories={categories} />
    </div>
  )
}

