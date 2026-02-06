'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ModernMenuBuilder from '@/components/menu/ModernMenuBuilder'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

export default function MenuManager({ businessId }: { businessId: string }) {
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
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  return <ModernMenuBuilder businessId={businessId} initialCategories={categories} />
}
