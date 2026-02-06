import { createServerClient } from '../supabase/server'

export async function getCategories(businessId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('business_id', businessId)
    .order('position', { ascending: true })
  
  if (error) throw error
  return data
}

export async function getItems(categoryId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('category_id', categoryId)
    .eq('available', true)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

export async function createCategory(businessId: string, name: string, position: number) {
  const supabase = await createServerClient()
  
  const { data, error } = await (supabase
    .from('categories') as any)
    .insert({ business_id: businessId, name, position, available: true })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateCategory(categoryId: string, updates: { name?: string; position?: number }) {
  const supabase = await createServerClient()
  
  const { data, error } = await (supabase
    .from('categories') as any)
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createServerClient()
  
  const { error } = await (supabase
    .from('categories') as any)
    .delete()
    .eq('id', categoryId)
  
  if (error) throw error
}

export async function createItem(categoryId: string, item: {
  name: string
  description?: string
  price?: number
  available?: boolean
}) {
  const supabase = await createServerClient()
  
  const { data, error } = await (supabase
    .from('items') as any)
    .insert({ category_id: categoryId, ...item })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateItem(itemId: string, updates: {
  name?: string
  description?: string
  price?: number
  available?: boolean
  position?: number
}) {
  const supabase = await createServerClient()
  
  const { data, error } = await (supabase
    .from('items') as any)
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteItem(itemId: string) {
  const supabase = await createServerClient()
  
  const { error } = await (supabase
    .from('items') as any)
    .delete()
    .eq('id', itemId)
  
  if (error) throw error
}

