import { createServerClient } from '../supabase/server'

export async function getAllThemes() {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('id')
  
  if (error) throw error
  return data
}

export async function updateBusinessTheme(businessId: string, themeId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await (supabase
    .from('businesses') as any)
    .update({ theme_id: themeId })
    .eq('id', businessId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

