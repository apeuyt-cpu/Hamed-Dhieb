import { createClient } from './supabase/client'

const BUCKET_NAME = 'menu-images'

export async function uploadBusinessLogo(businessId: string, file: File) {
  const supabase = createClient()
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${businessId}/logo.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  return publicUrl
}

export async function uploadItemImage(itemId: string, file: File) {
  const supabase = createClient()
  
  const fileExt = file.name.split('.').pop()
  const fileName = `items/${itemId}-${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  return publicUrl
}

export async function uploadCategoryImage(categoryId: string, file: File) {
  const supabase = createClient()
  
  const fileExt = file.name.split('.').pop()
  const fileName = `categories/${categoryId}-${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  return publicUrl
}

export async function deleteImage(filePath: string) {
  const supabase = createClient()
  
  // Extract path from URL if full URL is provided
  const path = filePath.includes(BUCKET_NAME) 
    ? filePath.split(`${BUCKET_NAME}/`)[1]
    : filePath
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) throw error
}

