import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()
    
    const supabase = await createServiceRoleClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Service role key or Supabase URL not configured' },
        { status: 500 }
      )
    }
    
    // Get all businesses to find owner IDs
    const { data: businesses, error: businessesError } = await (supabase
      .from('businesses') as any)
      .select('owner_id')
      .not('owner_id', 'is', null)
    
    if (businessesError) {
      return NextResponse.json(
        { error: `Failed to fetch businesses: ${businessesError.message}` },
        { status: 500 }
      )
    }
    
    const ownerIds = Array.from(new Set((businesses as any[])?.map((b: any) => b.owner_id).filter(Boolean) || []))
    
    if (ownerIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No businesses found',
        synced: 0,
        created: 0,
        errors: []
      })
    }
    
    // Get existing profiles
    const { data: existingProfiles, error: profilesError } = await (supabase
      .from('profiles') as any)
      .select('user_id')
      .in('user_id', ownerIds)
    
    if (profilesError) {
      console.error('Error fetching existing profiles:', profilesError)
    }
    
    const existingProfileIds = new Set((existingProfiles as any[])?.map((p: any) => p.user_id) || [])
    
    let created = 0
    let synced = 0
    const errors: string[] = []
    
    // Use REST API directly to fetch users
    try {
      // Use the Management API endpoint
      const authUrl = `${supabaseUrl}/auth/v1/admin/users`
      
      // Fetch all users using REST API
      const response = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Auth API error: ${response.status} - ${errorText}`)
      }
      
      const usersData = await response.json()
      const users = usersData.users || []
      
      console.log(`✅ Fetched ${users.length} users via REST API`)
      
      // Create a map of user IDs to user data
      const userMap = new Map()
      users.forEach((user: any) => {
        userMap.set(user.id, user)
      })
      
      // Process each owner ID
      for (const ownerId of ownerIds) {
        try {
          const user = userMap.get(ownerId)
          
          if (!user) {
            errors.push(`User ${ownerId.substring(0, 8)}...: Not found in auth.users`)
            continue
          }
          
          const email = user.email && user.email.trim() ? user.email.trim() : null
          // Phone can be in user.phone or user.user_metadata.phone_number
          const phone = (user.phone && user.phone.trim() ? user.phone.trim() : null) ||
                       (user.user_metadata?.phone_number && user.user_metadata.phone_number.trim() ? user.user_metadata.phone_number.trim() : null) ||
                       null
          
          // Check if profile exists
          const profileExists = existingProfileIds.has(ownerId)
          
          if (profileExists) {
            // Update existing profile - only update fields that are not null
            const updateData: any = {}
            if (email !== null && email !== undefined) {
              updateData.email = email
            }
            // Only update phone_number if we have a value (to avoid NOT NULL constraint violation)
            if (phone !== null && phone !== undefined && phone.trim() !== '') {
              updateData.phone_number = phone
            }
            
            // Only update if we have data to update
            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await (supabase
                .from('profiles') as any)
                .update(updateData)
                .eq('user_id', ownerId)
              
              if (updateError) {
                errors.push(`Update ${ownerId.substring(0, 8)}...: ${updateError.message}`)
              } else {
                synced++
              }
            } else {
              // No data to update, skip
              synced++
            }
          } else {
            // Create new profile - use empty string as default if phone is null (to satisfy NOT NULL constraint)
            const { error: insertError } = await (supabase
              .from('profiles') as any)
              .insert({
                user_id: ownerId,
                email: email || '',
                phone_number: phone || '',
                role: 'owner',
                created_at: new Date().toISOString()
              })
            
            if (insertError) {
              errors.push(`Create ${ownerId.substring(0, 8)}...: ${insertError.message}`)
            } else {
              created++
              existingProfileIds.add(ownerId)
            }
          }
        } catch (err: any) {
          errors.push(`User ${ownerId.substring(0, 8)}...: ${err.message || 'Unknown error'}`)
        }
      }
    } catch (apiError: any) {
      return NextResponse.json(
        { 
          error: `Failed to fetch users: ${apiError.message}`,
          hint: 'Make sure SUPABASE_SERVICE_ROLE_KEY has admin permissions'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${synced} profiles, created ${created} new profiles`,
      synced,
      created,
      total: ownerIds.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Sync profiles error:', error)
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

