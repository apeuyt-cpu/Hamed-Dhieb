import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()
    
    const supabase = await createServiceRoleClient()
    const adminClient = supabase as any
    
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
    const missingOwnerIds = ownerIds.filter(id => !existingProfileIds.has(id))
    
    let created = 0
    let synced = 0
    const errors: string[] = []
    
    // Fetch users from auth.users and create/update profiles
    if (adminClient.auth && adminClient.auth.admin) {
      // Try to list all users first (more efficient and reliable)
      let userMap = new Map()
      
      try {
        const { data: allUsersData, error: listError } = await adminClient.auth.admin.listUsers()
        
        if (!listError && allUsersData && allUsersData.users) {
          allUsersData.users.forEach((user: any) => {
            userMap.set(user.id, user)
          })
          console.log(`✅ Loaded ${userMap.size} users from auth.users`)
        } else if (listError) {
          console.warn(`⚠️  listUsers failed: ${listError.message}, falling back to getUserById`)
        }
      } catch (listErr: any) {
        console.warn(`⚠️  Error listing users: ${listErr.message}, falling back to getUserById`)
      }
      
      // Process each owner ID
      for (const ownerId of ownerIds) {
        try {
          let user: any = null
          
          // Try to get from map first
          if (userMap.has(ownerId)) {
            user = userMap.get(ownerId)
          } else {
            // Fallback to getUserById if not in map
            const { data: authUserData, error: userError } = await adminClient.auth.admin.getUserById(ownerId)
            
            if (userError) {
              errors.push(`User ${ownerId.substring(0, 8)}...: ${userError.message}`)
              continue
            }
            
            user = authUserData?.user || authUserData
          }
          
          if (!user) {
            errors.push(`User ${ownerId.substring(0, 8)}...: No user data found`)
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
              existingProfileIds.add(ownerId) // Track as existing now
            }
          }
        } catch (err: any) {
          errors.push(`User ${ownerId.substring(0, 8)}...: ${err.message || 'Unknown error'}`)
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Admin API not available. Service role key may be invalid.' },
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

