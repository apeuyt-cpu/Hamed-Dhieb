import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { user } = await requireOwner()
    
    // Get business owned by this user
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ design_type: 'normal' })
    }
    
    const supabase = await createServerClient()
    
    // Get design selection for this business
    const { data, error } = await supabase
      .from('design_selections')
      .select('design_type')
      .eq('business_id', business.id)
      .single()
    
    if (error) {
      // If no design selection found, default to normal
      return NextResponse.json({ design_type: 'normal' })
    }
    
    return NextResponse.json({ design_type: data.design_type })
  } catch (error: any) {
    return NextResponse.json({ design_type: 'normal' })
  }
}