import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    await requireSuperAdmin()
    
    const { email, phone_number } = await request.json()
    
    if (!email && !phone_number) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createServiceRoleClient()
    
    // First, get the business to find owner_id
    const { data: business, error: businessError } = await (supabase
      .from('businesses') as any)
      .select('owner_id')
      .eq('id', resolvedParams.id)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }
    
    const ownerId = business.owner_id as string
    
    // Check if profile exists
    const { data: existingProfile } = await (supabase
      .from('profiles') as any)
      .select('user_id, email, phone_number')
      .eq('user_id', ownerId)
      .maybeSingle()
    
    if (existingProfile) {
      // Update existing profile
      const updateData: any = {}
      if (email !== undefined) updateData.email = email || null
      if (phone_number !== undefined) updateData.phone_number = phone_number || null
      
      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('user_id', ownerId)
      
      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update profile: ${updateError.message}` },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        profile: {
          email: email || existingProfile.email,
          phone_number: phone_number || existingProfile.phone_number
        }
      })
    } else {
      // Create new profile
      const { error: insertError } = await (supabase
        .from('profiles') as any)
        .insert({
          user_id: ownerId,
          email: email || null,
          phone_number: phone_number || null,
          role: 'owner',
          created_at: new Date().toISOString()
        })
      
      if (insertError) {
        return NextResponse.json(
          { error: `Failed to create profile: ${insertError.message}` },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Profile created successfully',
        profile: {
          email: email || '',
          phone_number: phone_number || ''
        }
      })
    }
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

