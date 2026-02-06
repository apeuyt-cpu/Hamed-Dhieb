import { createServerClient } from '../supabase/server'
import { createServiceRoleClient } from '../supabase/server'
import type { Database } from '../supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const supabase = await createServerClient()
  
  try {
    // Allow both active and paused businesses to load
    // We'll check expiration in the page component
    const { data, error } = await supabase
      .from('businesses')
      .select('id, owner_id, name, slug, theme_id, status, logo_url, expires_at, primary_color, design')
      .eq('slug', slug)
      .in('status', ['active', 'paused'])
      .maybeSingle()
    
    if (error) {
      return null
    }
    return data
  } catch (error) {
    return null
  }
}

export async function getBusinessByOwner(ownerId: string): Promise<Business | null> {
  const supabase = await createServerClient()
  
  // First verify the user is an owner (not super_admin)
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('user_id', ownerId)
    .maybeSingle()
  
  if (profileError) {
    throw profileError
  }
  
  // Only allow owners to access their business
  // Super admins should use getAllBusinesses() instead
  if (!profile || profile.role !== 'owner') {
    return null
  }
  
  // Get business owned by this user
  const { data, error } = await supabase
    .from('businesses')
    .select('id, owner_id, name, slug, theme_id, status, logo_url, expires_at, primary_color, design')
    .eq('owner_id', ownerId)
    .maybeSingle()
  
  if (error) throw error
  return data
}

export async function getBusinessWithCategoriesAndItems(businessId: string) {
  const supabase = await createServerClient()
  
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select(`
      *,
      items (*)
    `)
    .eq('business_id', businessId)
    .order('position', { ascending: true })
  
  if (categoriesError) throw categoriesError
  
  // Sort items by position within each category
  // Supabase doesn't support ordering nested relations, so we sort in JavaScript
  if (categories) {
    (categories as any[]).forEach((category: any) => {
      if (category.items && Array.isArray(category.items)) {
        category.items.sort((a: any, b: any) => {
          // Sort by position first, then by created_at if position is null or equal
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
  }
  
  return categories
}

export async function getActiveBusinesses(): Promise<Array<{ slug: string; updated_at: string | null }>> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()
  
  // Get only active businesses that haven't expired
  const { data, error } = await supabase
    .from('businesses')
    .select('slug, updated_at')
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('updated_at', { ascending: false })
  
  if (error) {
    return []
  }
  return (data || []) as Array<{ slug: string; updated_at: string | null }>
}

export async function getAllBusinesses() {
  // Try service role first, fallback to regular client if not available
  let supabase
  let serviceRoleAvailable = false
  
  try {
    supabase = await createServiceRoleClient()
    serviceRoleAvailable = true
  } catch (error) {
    // Service role not available, use regular authenticated client
    supabase = await createServerClient()
  }
  
  // Auto-pause any expired businesses when super admin loads the list
  // This keeps the database in sync (only if service role is available)
  if (serviceRoleAvailable) {
    try {
      const now = new Date().toISOString()
      await (supabase.from('businesses') as any)
        .update({ status: 'paused' })
        .lt('expires_at', now)
        .eq('status', 'active')
    } catch (updateError) {
      // Silently fail if update fails (might be RLS or rate limit)
    }
  }
  
  // Fetch businesses first
  const { data, error } = await supabase
    .from('businesses')
    .select('id, owner_id, name, slug, theme_id, status, logo_url, expires_at, primary_color, created_at')
    .order('created_at', { ascending: false })
  
  if (error) {
    // Return empty array instead of throwing to prevent 500 errors
    return []
  }
  
  if (!data || data.length === 0) {
    return []
  }
  
  // Always fetch profiles separately to ensure we get the data
  const ownerIds = Array.from(new Set(data.map((b: any) => b.owner_id).filter(Boolean)))
  
  if (ownerIds.length > 0) {
    const profileMap = new Map()
    
    // Always use service role client for profile queries to bypass RLS
    let profileSupabase = supabase
    try {
      // Try to get service role client for profiles (bypasses RLS)
      profileSupabase = await createServiceRoleClient()
      console.log('[getAllBusinesses] Using service role client for profile queries')
    } catch (err) {
      console.warn('[getAllBusinesses] Service role not available for profiles, using regular client:', err)
      // Fall back to regular client
      profileSupabase = supabase
    }
    
    // Fetch profiles - query each one individually to ensure we get the data
    try {
      console.log(`[getAllBusinesses] Fetching profiles for ${ownerIds.length} owner IDs`)
      
      // Query each profile individually to ensure we get the data
      for (const ownerId of ownerIds) {
        try {
          const { data: profile, error: profileError } = await (profileSupabase
            .from('profiles') as any)
            .select('user_id, email, phone_number')
            .eq('user_id', ownerId)
            .maybeSingle()
          
          if (profileError) {
            console.error(`[getAllBusinesses] Error fetching profile for ${ownerId}:`, profileError)
            continue
          }
          
          if (profile) {
            const profileData = profile as any
            const email = profileData.email ? String(profileData.email).trim() : null
            const phone = profileData.phone_number ? String(profileData.phone_number).trim() : null
            profileMap.set(profileData.user_id, {
              email: email,
              phone_number: phone
            })
            console.log(`[getAllBusinesses] Found profile for ${ownerId}:`, { email, phone })
          } else {
            console.warn(`[getAllBusinesses] No profile found for ${ownerId}`)
          }
        } catch (err) {
          console.error(`[getAllBusinesses] Exception fetching profile for ${ownerId}:`, err)
        }
      }
      
      console.log(`[getAllBusinesses] Profile map after individual queries:`, {
        mapSize: profileMap.size,
        entries: Array.from(profileMap.entries())
      })
    } catch (err) {
      console.error('[getAllBusinesses] Error fetching profiles:', err)
    }
    
    // Debug: Log profile map before mapping to businesses
    console.log('[getAllBusinesses] Profile map before mapping:', {
      mapSize: profileMap.size,
      ownerIds: ownerIds,
      mapEntries: Array.from(profileMap.entries())
    })
    
    // Map profiles to businesses
    data.forEach((business: any) => {
      let profile = profileMap.get(business.owner_id)
      
      // Debug: Log profile data
      if (business.owner_id) {
        if (profile) {
          console.log(`[getAllBusinesses] Profile for ${business.owner_id}:`, {
            email: profile.email,
            phone: profile.phone_number,
            hasEmail: !!profile.email,
            hasPhone: !!profile.phone_number
          })
        } else {
          console.warn(`[getAllBusinesses] No profile found for owner_id: ${business.owner_id}`)
        }
      }
      
      // Ensure profile structure is correct - preserve all values including empty strings
      if (profile) {
        business.profiles = {
          email: profile.email !== undefined && profile.email !== null ? String(profile.email) : null,
          phone_number: profile.phone_number !== undefined && profile.phone_number !== null ? String(profile.phone_number) : null
        }
      } else {
        business.profiles = null
      }
    })
    
    // Debug: Log final data structure
    console.log('[getAllBusinesses] Final businesses with profiles:', data.map((b: any) => ({
      name: b.name,
      owner_id: b.owner_id,
      hasProfile: !!b.profiles,
      email: b.profiles?.email,
      phone: b.profiles?.phone_number
    })))
  } else {
    // No owner IDs, set all profiles to null
    data.forEach((business: any) => {
      business.profiles = null
    })
  }

  // Fetch design selections for these businesses and attach them to the business objects
  try {
    const businessIds = (data as any[]).map((b: any) => b.id).filter(Boolean)
    if (businessIds.length > 0) {
      const { data: dsRows, error: dsError } = await supabase
        .from('design_selections')
        .select('business_id, design_type, description')
        .in('business_id', businessIds)

      if (dsError) {
        console.warn('[getAllBusinesses] Failed to fetch design_selections:', dsError)
      } else if (dsRows) {
        const dsMap = new Map((dsRows as any[]).map((r: any) => [r.business_id, r]))
        (data as any[]).forEach((b: any) => {
          const ds = dsMap.get(b.id)
          b.design_selection = ds ? { design_type: ds.design_type, description: ds.description } : null
        })

        // Create missing design_selections for businesses that don't have one
        const missingBusinessIds = businessIds.filter((id: string) => !dsMap.has(id))
        if (missingBusinessIds.length > 0) {
          console.log(`[getAllBusinesses] Creating default design_selections for ${missingBusinessIds.length} businesses`)
          const insertData = missingBusinessIds.map((id: string) => ({
            business_id: id,
            design_type: 'normal' as const,
            description: null
          }))
          
          // Use service role for insert if available
          let insertSupabase = supabase
          try {
            insertSupabase = await createServiceRoleClient()
          } catch (serviceError) {
            console.warn('[getAllBusinesses] Service role not available for design_selections insert, using regular client')
          }
          
          const { error: insertError } = await insertSupabase
            .from('design_selections')
            .insert(insertData)
          
          if (insertError) {
            console.warn('[getAllBusinesses] Failed to create default design_selections:', insertError)
          } else {
            // Update the business objects with the default
            missingBusinessIds.forEach((id: string) => {
              const business = (data as any[]).find((b: any) => b.id === id)
              if (business) {
                business.design_selection = { design_type: 'normal', description: null }
              }
            })
          }
        }
      }
    }
  } catch (err) {
    console.warn('[getAllBusinesses] Error fetching design_selections:', err)
  }

  return data
}

export async function updateBusinessStatus(businessId: string, status: 'active' | 'paused') {
  // Try service role first, fallback to regular client if not available
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch {
    // Service role not available, use regular authenticated client
    supabase = await createServerClient()
  }
  
  const { data, error } = await (supabase
    .from('businesses') as any)
    .update({ status })
    .eq('id', businessId)
    .select('id, status')
    .single()
  
  if (error) throw error
  return data
}

export async function getBusinessDesignForDisplay(businessId: string) {
  const supabase = await createServerClient()
  
  // First, get the business to check if there's a QR-linked design version
  const { data: business } = await supabase
    .from('businesses')
    .select('id, qr_design_version_id, design')
    .eq('id', businessId)
    .single()
  
  if (!business) {
    return null
  }
  
  // If there's a QR-linked design version, fetch it
  if (business.qr_design_version_id) {
    const { data: designVersion } = await supabase
      .from('design_versions')
      .select('design')
      .eq('id', business.qr_design_version_id)
      .single()
    
    if (designVersion && designVersion.design) {
      return designVersion.design
    }
  }
  
  // Otherwise, return the business's design column
  return business.design
}
