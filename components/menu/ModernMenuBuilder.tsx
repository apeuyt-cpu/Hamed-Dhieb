'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadItemImage, uploadCategoryImage, deleteImage } from '@/lib/storage'
import * as XLSX from 'xlsx'
import type { Database } from '@/lib/supabase/database.types'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}

interface ModernMenuBuilderProps {
  businessId: string
  initialCategories: Category[]
}

export default function ModernMenuBuilder({ businessId, initialCategories }: ModernMenuBuilderProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    initialCategories.length > 0 ? initialCategories[0].id : null
  )
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [showExcelTemplate, setShowExcelTemplate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const refreshCategories = async () => {
    setLoading(true)
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select(`*, items (*)`)
        .eq('business_id', businessId)
        .order('position', { ascending: true })

      if (cats) {
        // Sort items by position within each category
        cats.forEach((cat: any) => {
          if (cat.items && Array.isArray(cat.items)) {
            cat.items.sort((a: any, b: any) => {
              // Sort by position first, then by created_at if position is null
              const posA = a.position !== null && a.position !== undefined ? a.position : 999999
              const posB = b.position !== null && b.position !== undefined ? b.position : 999999
              if (posA !== posB) return posA - posB
              // If positions are equal or both null, sort by created_at
              const dateA = new Date(a.created_at || 0).getTime()
              const dateB = new Date(b.created_at || 0).getTime()
              return dateA - dateB
            })
          }
        })
        setCategories(cats as Category[])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (name: string, imageFile?: File) => {
    if (!name?.trim()) return
    setLoading(true)
    try {
      const position = categories.length
      const { data: newCat, error: catError } = await (supabase.from('categories') as any)
        .insert({ business_id: businessId, name: name.trim(), position, available: true })
        .select()
        .single()
      
      if (catError) throw catError

      if (imageFile && newCat?.id) {
        try {
          const imageUrl = await uploadCategoryImage(newCat.id, imageFile)
          await (supabase.from('categories') as any)
            .update({ image_url: imageUrl })
            .eq('id', newCat.id)
        } catch (imgErr) {
          console.error('Category image upload failed:', imgErr)
        }
      }
      
      setAddingCategory(false)
      await refreshCategories()
      setExpandedCategory(newCat.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = async (categoryId: string, itemData: {
    name: string
    description?: string
    price?: number
    image?: File
    removeImage?: boolean
  }, itemId?: string) => {
    setLoading(true)
    try {
      if (itemId) {
        // Update existing item
        const updateData: any = {
          name: itemData.name,
          description: itemData.description || null,
          price: itemData.price || null,
        }

        if (itemData.removeImage) {
          // Remove image
          const { data: oldItem } = await (supabase.from('items') as any)
            .select('image_url')
            .eq('id', itemId)
            .single()
          
          if (oldItem?.image_url) {
            try { await deleteImage(oldItem.image_url) } catch {}
          }
          updateData.image_url = null
        } else if (itemData.image) {
          // Upload new image
          const { data: oldItem } = await (supabase.from('items') as any)
            .select('image_url')
            .eq('id', itemId)
            .single()
          
          if (oldItem?.image_url) {
            try { await deleteImage(oldItem.image_url) } catch {}
          }
          
          const imageUrl = await uploadItemImage(itemId, itemData.image)
          updateData.image_url = imageUrl
        }

        await (supabase.from('items') as any)
          .update(updateData)
          .eq('id', itemId)
      } else {
        // Create new item - set position to end of category
        const category = categories.find(c => c.id === categoryId)
        const maxPosition = category?.items 
          ? Math.max(...category.items.map((i: any) => i.position ?? -1), -1)
          : -1
        const newPosition = maxPosition + 1
        
        const { data: newItem, error: insertError } = await (supabase.from('items') as any)
          .insert({
            category_id: categoryId,
            name: itemData.name,
            description: itemData.description || null,
            price: itemData.price || null,
            available: true,
            position: newPosition
          })
          .select()
          .single()

        if (insertError) throw insertError

        if (itemData.image && newItem?.id) {
          try {
            const imageUrl = await uploadItemImage(newItem.id, itemData.image)
            await (supabase.from('items') as any)
              .update({ image_url: imageUrl })
              .eq('id', newItem.id)
          } catch (imageError) {
            console.error('Image upload failed:', imageError)
          }
        }
      }
      
      setEditingItem(null)
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCategory = async (categoryId: string, name: string, imageFile?: File) => {
    if (!name?.trim()) return
    setLoading(true)
    try {
      const updateData: any = { name: name.trim() }

      if (imageFile !== undefined) {
        const category = categories.find(c => c.id === categoryId)
        if (imageFile) {
          // Upload new image
          if (category?.image_url) {
            try { await deleteImage(category.image_url) } catch {}
          }
          const imageUrl = await uploadCategoryImage(categoryId, imageFile)
          updateData.image_url = imageUrl
        } else {
          // Delete image
          if (category?.image_url) {
            try { await deleteImage(category.image_url) } catch {}
          }
          updateData.image_url = null
        }
      }

      await (supabase.from('categories') as any)
        .update(updateData)
        .eq('id', categoryId)
      
      setEditingCategory(null)
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string, imageUrl: string | null) => {
    if (!confirm('هل تريد حذف هذا العنصر؟')) return
    setLoading(true)
    try {
      if (imageUrl) {
        try { await deleteImage(imageUrl) } catch {}
      }
      await (supabase.from('items') as any).delete().eq('id', itemId)
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, imageUrl: string | null) => {
    if (!confirm('هل تريد حذف هذه الفئة وجميع العناصر؟')) return
    setLoading(true)
    try {
      if (imageUrl) {
        try { await deleteImage(imageUrl) } catch {}
      }
      await (supabase.from('categories') as any).delete().eq('id', categoryId)
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCategoryImage = async (categoryId: string, imageFile: File | null, oldImageUrl: string | null) => {
    setLoading(true)
    try {
      if (imageFile) {
        // Upload new image
        if (oldImageUrl) {
          try { await deleteImage(oldImageUrl) } catch {}
        }
        const imageUrl = await uploadCategoryImage(categoryId, imageFile)
        await (supabase.from('categories') as any)
          .update({ image_url: imageUrl })
          .eq('id', categoryId)
      } else {
        // Delete image
        if (oldImageUrl) {
          try { await deleteImage(oldImageUrl) } catch {}
        }
        await (supabase.from('categories') as any)
          .update({ image_url: null })
          .eq('id', categoryId)
      }
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (itemId: string, currentAvailable: boolean) => {
    try {
      await (supabase.from('items') as any)
        .update({ available: !currentAvailable })
        .eq('id', itemId)
      await refreshCategories()
    } catch (err) {
      console.error('Error toggling availability:', err)
    }
  }

  const toggleCategoryAvailability = async (categoryId: string, currentAvailable: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const newAvailable = !currentAvailable
      const { data, error } = await (supabase.from('categories') as any)
        .update({ available: newAvailable })
        .eq('id', categoryId)
        .select()
      
      if (error) {
        console.error('Error toggling category availability:', error)
        // Check if error is about missing column
        if (error.message?.includes('column') && error.message?.includes('available')) {
          setError('خطأ: عمود "available" غير موجود في قاعدة البيانات. يرجى إضافة العمود أولاً.')
        } else {
          setError('فشل في تحديث حالة الفئة: ' + error.message)
        }
        setLoading(false)
        return
      }
      
      // Optimistically update the UI
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === categoryId 
            ? { ...cat, available: newAvailable }
            : cat
        )
      )
      
      // Refresh to get latest data
      await refreshCategories()
    } catch (err: any) {
      console.error('Error toggling category availability:', err)
      setError('فشل في تحديث حالة الفئة: ' + (err.message || 'خطأ غير معروف'))
    } finally {
      setLoading(false)
    }
  }

  const moveItem = async (categoryId: string, itemId: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    const items = [...category.items].sort((a: any, b: any) => {
      const posA = a.position ?? 999999
      const posB = b.position ?? 999999
      return posA - posB
    })

    const currentIndex = items.findIndex((i: any) => i.id === itemId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const currentItem = items[currentIndex] as any
    const targetItem = items[newIndex] as any

    // Swap positions
    const currentPos = currentItem.position ?? currentIndex
    const targetPos = targetItem.position ?? newIndex

    setLoading(true)
    try {
      // Update both items' positions
      await Promise.all([
        (supabase.from('items') as any).update({ position: targetPos }).eq('id', itemId),
        (supabase.from('items') as any).update({ position: currentPos }).eq('id', targetItem.id)
      ])
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const sortedCategories = [...categories].sort((a: any, b: any) => {
      const posA = a.position ?? 999999
      const posB = b.position ?? 999999
      return posA - posB
    })

    const currentIndex = sortedCategories.findIndex(c => c.id === categoryId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= sortedCategories.length) return

    const currentCat = sortedCategories[currentIndex] as any
    const targetCat = sortedCategories[newIndex] as any

    // Swap positions
    const currentPos = currentCat.position ?? currentIndex
    const targetPos = targetCat.position ?? newIndex

    setLoading(true)
    try {
      await Promise.all([
        (supabase.from('categories') as any).update({ position: targetPos }).eq('id', categoryId),
        (supabase.from('categories') as any).update({ position: currentPos }).eq('id', targetCat.id)
      ])
      await refreshCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExcelImport = async (file: File) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      // Skip header row
      const rows = jsonData.slice(1).filter(row => row && row.length > 0 && row[0])

      if (rows.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على بيانات')
      }

      // Group items by category
      const categoryMap = new Map<string, any[]>()
      
      for (const row of rows) {
        const categoryName = String(row[0] || '').trim()
        const itemName = String(row[1] || '').trim()
        const description = row[2] ? String(row[2]).trim() : null
        const price = row[3] ? parseFloat(String(row[3])) : null

        if (!categoryName || !itemName) continue

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, [])
        }
        
        categoryMap.get(categoryName)!.push({
          name: itemName,
          description: description || null,
          price: price && !isNaN(price) ? price : null,
        })
      }

      // Create categories and items
      let categoryPosition = categories.length
      
      for (const [categoryName, items] of Array.from(categoryMap.entries())) {
        // Check if category exists
        let category = categories.find(c => c.name === categoryName)
        let categoryId = category?.id

        if (!categoryId) {
          // Create new category
          const { data: newCat, error: catError } = await (supabase.from('categories') as any)
            .insert({ business_id: businessId, name: categoryName, position: categoryPosition, available: true })
            .select()
            .single()
          
          if (catError) throw catError
          categoryId = newCat.id
          categoryPosition++
          
          // New category has no items yet, start from 0
          category = { items: [] } as any
        }

        // Insert items with positions
        if (items.length > 0) {
          // Calculate starting position for new items
          // If category has existing items, find max position and continue from there
          let startPosition = 0
          if (category?.items && Array.isArray(category.items) && category.items.length > 0) {
            const existingPositions = category.items
              .map((item: any) => item.position)
              .filter((pos: any) => pos !== null && pos !== undefined)
            
            if (existingPositions.length > 0) {
              const maxPosition = Math.max(...existingPositions)
              startPosition = maxPosition + 1
            } else {
              // If no positions set, use item count as starting point
              startPosition = category.items.length
            }
          }

          const itemsToInsert = items.map((item, idx) => ({
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            available: true,
            position: startPosition + idx,
          }))

          const { error: itemsError } = await (supabase.from('items') as any)
            .insert(itemsToInsert)

          if (itemsError) throw itemsError
        }
      }

      await refreshCategories()
      setShowExcelImport(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'فشل في استيراد البيانات من ملف Excel')
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadExcelTemplate = () => {
    const templateData = [
      ['الفئة', 'اسم العنصر', 'الوصف', 'السعر'],
      ['المشروبات الساخنة', 'قهوة إسبريسو', 'قهوة إيطالية قوية', '3.50'],
      ['المشروبات الساخنة', 'كابتشينو', 'إسبريسو مع حليب مبخر ورغوة', '4.75'],
      ['المشروبات الباردة', 'قهوة مثلجة', 'قهوة باردة', '4.25'],
      ['الحلويات', 'كرواسان', 'كرواسان بالزبدة', '3.25'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'القائمة')
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // الفئة
      { wch: 25 }, // اسم العنصر
      { wch: 40 }, // الوصف
      { wch: 10 }, // السعر
    ]

    XLSX.writeFile(wb, 'نموذج_القائمة.xlsx')
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm lg:text-base flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg">✕</button>
        </div>
      )}

      {/* Excel Import Section */}
      {showExcelImport && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-blue-900">استيراد من ملف Excel</h3>
            <button
              onClick={() => {
                setShowExcelImport(false)
                setShowExcelTemplate(false)
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          
          {showExcelTemplate ? (
            <div className="space-y-3">
              <p className="text-sm text-blue-800 font-medium">هيكل ملف Excel:</p>
              <div className="bg-white rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border border-blue-300 px-3 py-2 text-right">الفئة</th>
                      <th className="border border-blue-300 px-3 py-2 text-right">اسم العنصر</th>
                      <th className="border border-blue-300 px-3 py-2 text-right">الوصف</th>
                      <th className="border border-blue-300 px-3 py-2 text-right">السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-blue-200 px-3 py-2">المشروبات الساخنة</td>
                      <td className="border border-blue-200 px-3 py-2">قهوة إسبريسو</td>
                      <td className="border border-blue-200 px-3 py-2">قهوة إيطالية قوية</td>
                      <td className="border border-blue-200 px-3 py-2">3.50</td>
                    </tr>
                    <tr>
                      <td className="border border-blue-200 px-3 py-2">المشروبات الساخنة</td>
                      <td className="border border-blue-200 px-3 py-2">كابتشينو</td>
                      <td className="border border-blue-200 px-3 py-2">إسبريسو مع حليب مبخر</td>
                      <td className="border border-blue-200 px-3 py-2">4.75</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={downloadExcelTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  تحميل نموذج Excel
                </button>
                <button
                  onClick={() => setShowExcelTemplate(false)}
                  className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExcelTemplate(true)}
                  className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  عرض هيكل الملف
                </button>
                <button
                  onClick={downloadExcelTemplate}
                  className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  تحميل نموذج
                </button>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-blue-900">
                  اختر ملف Excel (.xlsx أو .xls)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleExcelImport(file)
                    }
                  }}
                  className="block w-full text-sm text-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <div className="mt-2 text-xs text-blue-700 space-y-1">
                  <p>يجب أن يحتوي الملف على الأعمدة: الفئة، اسم العنصر، الوصف (اختياري)، السعر (اختياري)</p>
                  <p className="text-blue-600 font-medium">
                    💡 ملاحظة: سيتم تعيين ترتيب الفئات والعناصر تلقائياً حسب ترتيبها في الملف
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Category */}
      {!addingCategory && !showExcelImport ? (
        <div className="flex gap-3">
          <button
            onClick={() => setAddingCategory(true)}
            disabled={loading}
            className="flex-1 py-4 border-2 border-dashed border-zinc-300 rounded-2xl text-base lg:text-lg font-medium text-zinc-500 hover:text-zinc-700 hover:border-zinc-400 transition-colors disabled:opacity-50"
          >
            + إضافة فئة
          </button>
          <button
            onClick={() => setShowExcelImport(true)}
            disabled={loading}
            className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-base lg:text-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            استيراد Excel
          </button>
        </div>
      ) : addingCategory ? (
        <CategoryForm
          onSave={handleAddCategory}
          onCancel={() => setAddingCategory(false)}
          loading={loading}
        />
      ) : null}

      {/* Categories */}
      {categories.length === 0 && !addingCategory ? (
        <div className="text-center py-16 text-zinc-400 text-base lg:text-lg">
          لا توجد فئات بعد. أضف واحدة للبدء.
        </div>
      ) : (
        <div className="space-y-4">
          {categories
            .filter((category) => {
              // Show all categories in admin view (even hidden ones), but mark them as hidden
              // This allows admins to see and manage hidden categories
              return true
            })
            .map((category) => {
            const isExpanded = expandedCategory === category.id
            const itemCount = category.items?.filter(i => i.available).length || 0
            // Check if category is available - default to true if field doesn't exist or is null
            const categoryAvailable = category.available !== false && category.available !== null
            
            return (
              <div 
                key={category.id} 
                className={`bg-white rounded-2xl border border-zinc-200 overflow-hidden ${!categoryAvailable ? 'opacity-50' : ''}`}
              >
                {/* Category Header */}
                <div className="w-full p-5 lg:p-6 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="flex-1 flex items-center justify-between hover:bg-zinc-50 transition-colors rounded-lg p-2 -m-2"
                  >
                    <div className="flex items-center gap-4">
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt="" 
                          className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </div>
                      )}
                      <div className="text-right">
                        <h3 className="font-bold text-zinc-900 text-base lg:text-lg">{category.name}</h3>
                        <p className="text-sm lg:text-base text-zinc-500">{itemCount} عناصر</p>
                      </div>
                    </div>
                    <span 
                      className={`text-zinc-400 transition-transform text-lg ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </span>
                  </button>
                  {/* Category Hide/Show Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (!loading) {
                        toggleCategoryAvailability(category.id, categoryAvailable)
                      }
                    }}
                    disabled={loading}
                    className={`ml-3 w-10 h-6 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-50 ${
                      categoryAvailable ? 'bg-green-500' : 'bg-zinc-300'
                    }`}
                    title={categoryAvailable ? 'إخفاء الفئة' : 'إظهار الفئة'}
                  >
                    <span 
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        categoryAvailable ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    {/* Category Cover Image Section */}
                    <div className="px-5 lg:px-6 py-4 bg-zinc-50 border-b border-zinc-100">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {category.image_url ? (
                            <img 
                              src={category.image_url} 
                              alt={category.name}
                              className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl object-cover border-2 border-zinc-200"
                            />
                          ) : (
                            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-zinc-200 border-2 border-dashed border-zinc-300 flex items-center justify-center">
                              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-sm lg:text-base font-medium text-zinc-700">صورة غلاف الفئة</p>
                            <p className="text-xs lg:text-sm text-zinc-500">ستظهر في أعلى الفئة في القائمة</p>
                          </div>
                        </div>
                        <label className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-xl text-sm lg:text-base font-medium hover:bg-zinc-50 hover:border-zinc-400 cursor-pointer flex items-center gap-2 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {category.image_url ? 'تغيير الصورة' : 'إضافة صورة'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUpdateCategoryImage(category.id, file, category.image_url)
                            }}
                          />
                        </label>
                      </div>
                      {category.image_url && (
                        <button
                          onClick={() => handleUpdateCategoryImage(category.id, null, category.image_url)}
                          disabled={loading}
                          className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          حذف الصورة
                        </button>
                      )}
                    </div>
                    
                    {/* Category Actions */}
                    <div className="px-5 lg:px-6 py-4 bg-zinc-50 flex gap-3 flex-wrap items-center">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveCategory(category.id, 'up')}
                          disabled={loading || categories.findIndex(c => c.id === category.id) === 0}
                          className="p-2 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-100"
                          title="نقل لأعلى"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveCategory(category.id, 'down')}
                          disabled={loading || categories.findIndex(c => c.id === category.id) >= categories.length - 1}
                          className="p-2 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-100"
                          title="نقل لأسفل"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => setEditingItem('new-' + category.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm lg:text-base font-medium hover:bg-zinc-800 disabled:opacity-50"
                      >
                        + إضافة عنصر
                      </button>
                      <button
                        onClick={() => setEditingCategory(category.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm lg:text-base font-medium hover:bg-blue-100 disabled:opacity-50"
                      >
                        ✏️ تعديل الفئة
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.image_url)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm lg:text-base font-medium hover:bg-red-100 disabled:opacity-50 ml-auto"
                      >
                        حذف الفئة
                      </button>
                    </div>

                    {/* Edit Category Form */}
                    {editingCategory === category.id && (
                      <div className="p-5 lg:p-6 border-t border-zinc-100">
                        <CategoryForm
                          onSave={(name, image) => handleUpdateCategory(category.id, name, image)}
                          onCancel={() => setEditingCategory(null)}
                          loading={loading}
                          initialName={category.name}
                          initialImageUrl={category.image_url}
                          isEdit={true}
                        />
                      </div>
                    )}

                    {/* Add Item Form */}
                    {editingItem === 'new-' + category.id && (
                      <div className="p-5 lg:p-6 border-t border-zinc-100">
                        <ItemForm
                          onSave={(data) => handleSaveItem(category.id, data)}
                          onCancel={() => setEditingItem(null)}
                          loading={loading}
                        />
                      </div>
                    )}

                    {/* Items */}
                    <div className="divide-y divide-zinc-100">
                      {category.items?.map((item) => (
                        <div key={item.id}>
                          {editingItem === 'edit-' + item.id ? (
                            /* Edit Item Form */
                            <div className="p-5 lg:p-6 border-t border-zinc-100">
                              <ItemForm
                                onSave={(data) => handleSaveItem(category.id, data, item.id)}
                                onCancel={() => setEditingItem(null)}
                                loading={loading}
                                initialData={{
                                  name: item.name,
                                  description: item.description || '',
                                  price: item.price ? item.price.toString() : '',
                                }}
                                initialImageUrl={item.image_url}
                                isEdit={true}
                              />
                            </div>
                          ) : (
                            /* Item Display */
                            <div 
                              className={`p-5 lg:p-6 flex items-center gap-4 ${!item.available ? 'opacity-50' : ''}`}
                            >
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt="" 
                                  className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-300 text-xs flex-shrink-0">
                                  صورة
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                  <h4 className="font-semibold text-zinc-900 text-sm lg:text-lg break-words">{item.name}</h4>
                                  {item.price && (
                                    <span className="text-xs lg:text-base font-bold text-zinc-600 whitespace-nowrap" dir="ltr">
                                      {Number(item.price).toFixed(2)} TD
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs lg:text-base text-zinc-500 break-words mt-1">{item.description}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Order Controls */}
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => moveItem(category.id, item.id, 'up')}
                                    disabled={loading || (category.items?.findIndex((i: any) => i.id === item.id) ?? 0) === 0}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="نقل لأعلى"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => moveItem(category.id, item.id, 'down')}
                                    disabled={loading || (category.items?.findIndex((i: any) => i.id === item.id) ?? -1) >= (category.items?.length ?? 0) - 1}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="نقل لأسفل"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                                <button
                                  onClick={() => setEditingItem('edit-' + item.id)}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs lg:text-sm font-medium hover:bg-blue-100 transition-colors"
                                  title="تعديل"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => toggleAvailability(item.id, item.available)}
                                  className={`w-10 h-6 rounded-full transition-colors relative ${
                                    item.available ? 'bg-green-500' : 'bg-zinc-300'
                                  }`}
                                  title={item.available ? 'إخفاء' : 'إظهار'}
                                >
                                  <span 
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                      item.available ? 'left-5' : 'left-1'
                                    }`}
                                  />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.image_url)}
                                  className="text-zinc-400 hover:text-red-500 text-lg"
                                  title="حذف"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {(!category.items || category.items.length === 0) && editingItem !== 'new-' + category.id && (
                        <div className="p-10 text-center text-zinc-400 text-base lg:text-lg">
                          لا توجد عناصر بعد
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function CategoryForm({
  onSave,
  onCancel,
  loading,
  initialName = '',
  initialImageUrl = null,
  isEdit = false
}: {
  onSave: (name: string, image?: File) => void
  onCancel: () => void
  loading: boolean
  initialName?: string
  initialImageUrl?: string | null
  isEdit?: boolean
}) {
  const [name, setName] = useState(initialName)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (isEdit && removeImage && !image) {
      onSave(name.trim(), undefined) // Pass undefined to remove image
    } else {
      onSave(name.trim(), image || undefined)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-5 lg:p-6">
      <div className="flex gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الفئة"
          autoFocus
          className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl text-base lg:text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
        <label className="px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl cursor-pointer hover:bg-zinc-200 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      
      {isEdit && initialImageUrl && !image && !removeImage && (
        <div className="mt-3 flex items-center gap-3">
          <img 
            src={initialImageUrl} 
            alt="Current" 
            className="w-16 h-16 rounded-xl object-cover border border-zinc-200"
          />
          <button
            type="button"
            onClick={() => setRemoveImage(true)}
            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            حذف الصورة
          </button>
        </div>
      )}
      
      {image && (
        <p className="text-sm lg:text-base text-zinc-500 mt-3">صورة جديدة: {image.name}</p>
      )}
      
      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-5 py-3 bg-zinc-900 text-white rounded-xl text-base lg:text-lg font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? (isEdit ? 'جاري التحديث...' : 'جاري الإنشاء...') : (isEdit ? 'حفظ التغييرات' : 'إنشاء')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-base lg:text-lg font-medium hover:bg-zinc-200"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}


function ItemForm({ 
  onSave, 
  onCancel, 
  loading,
  initialData,
  initialImageUrl,
  isEdit = false
}: { 
  onSave: (data: { name: string; description?: string; price?: number; image?: File; removeImage?: boolean }) => void
  onCancel: () => void
  loading: boolean
  initialData?: { name: string; description: string; price: string }
  initialImageUrl?: string | null
  isEdit?: boolean
}) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price || '')
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      image: image || undefined,
      removeImage: isEdit && removeImage && !image ? true : undefined
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم العنصر"
          autoFocus
          className="col-span-2 sm:col-span-1 px-4 py-3 border border-zinc-200 rounded-xl text-base lg:text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="السعر (TD)"
          dir="ltr"
          className="col-span-2 sm:col-span-1 px-4 py-3 border border-zinc-200 rounded-xl text-base lg:text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="الوصف (اختياري)"
          className="col-span-2 px-4 py-3 border border-zinc-200 rounded-xl text-base lg:text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>
      
      {isEdit && initialImageUrl && !image && !removeImage && (
        <div className="flex items-center gap-3 mb-4">
          <img 
            src={initialImageUrl} 
            alt="Current" 
            className="w-20 h-20 rounded-xl object-cover border border-zinc-200"
          />
          <button
            type="button"
            onClick={() => setRemoveImage(true)}
            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            حذف الصورة
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-sm lg:text-base cursor-pointer hover:bg-zinc-200 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {image ? image.name.slice(0, 15) + '...' : (isEdit && removeImage ? 'تم تحديد الحذف' : 'إضافة صورة')}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setImage(e.target.files?.[0] || null)
              setRemoveImage(false)
            }}
          />
        </label>
        
        <div className="flex-1" />
        
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-zinc-500 text-base lg:text-lg font-medium hover:text-zinc-700"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-5 py-2 bg-zinc-900 text-white rounded-xl text-base lg:text-lg font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? (isEdit ? 'جاري التحديث...' : 'جاري الإضافة...') : (isEdit ? 'حفظ التغييرات' : 'إضافة عنصر')}
        </button>
      </div>
    </form>
  )
}
