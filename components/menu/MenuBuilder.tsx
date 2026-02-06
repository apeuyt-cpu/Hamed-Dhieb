'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

interface MenuBuilderProps {
  businessId: string
  initialCategories: Category[]
}

export default function MenuBuilder({ businessId, initialCategories }: MenuBuilderProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const refreshCategories = async () => {
    setLoading(true)
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select(`
          *,
          items (*)
        `)
        .eq('business_id', businessId)
        .order('position', { ascending: true })

      if (cats) {
        setCategories(cats as Category[])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    const name = prompt('Category name:')
    if (!name) return

    setLoading(true)
    try {
      const position = categories.length
      const { data, error } = await (supabase
        .from('categories') as any)
        .insert({ business_id: businessId, name, position })
        .select()
        .single()

      if (error) throw error
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category and all its items?')) return

    setLoading(true)
    try {
      const { error } = await (supabase
        .from('categories') as any)
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (categoryId: string) => {
    const name = prompt('Item name:')
    if (!name) return

    const description = prompt('Description (optional):') || null
    const priceInput = prompt('Price (optional):')
    const price = priceInput ? parseFloat(priceInput) : null

    setLoading(true)
    try {
      const { error } = await (supabase
        .from('items') as any)
        .insert({ category_id: categoryId, name, description, price, available: true })

      if (error) throw error
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return

    setLoading(true)
    try {
      const { error } = await (supabase
        .from('items') as any)
        .delete()
        .eq('id', itemId)

      if (error) throw error
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    setLoading(true)
    try {
      const { error } = await (supabase
        .from('items') as any)
        .update({ available: !currentStatus })
        .eq('id', itemId)

      if (error) throw error
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={handleAddCategory}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          + Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No categories yet. Add your first category to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{category.name}</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => handleAddItem(category.id)}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    + Add Item
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={loading}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {category.items && category.items.length > 0 ? (
                <div className="space-y-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-4 border border-gray-200 rounded"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.name}</h3>
                          {!item.available && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Unavailable
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        {item.price && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            ${Number(item.price).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleToggleItemAvailability(item.id, item.available)}
                          disabled={loading}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                        >
                          {item.available ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={loading}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No items in this category yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

