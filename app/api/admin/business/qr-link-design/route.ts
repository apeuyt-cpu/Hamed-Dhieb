import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { createServerClient } from '@/lib/supabase/server'

// Link a QR code to a design version
export async function POST(request: Request) {
  try {
    const { user } = await requireOwner()
    const body = await request.json()
    const { designVersionId } = body
    
    if (!designVersionId) {
      return NextResponse.json({ error: 'designVersionId is required' }, { status: 400 })
    }
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    // Verify the design version belongs to this business
    const { data: designVersion } = await supabase
      .from('design_versions')
      .select('id')
      .eq('id', designVersionId)
      .eq('business_id', business.id)
      .single()
    
    if (!designVersion) {
      return NextResponse.json({ error: 'Design version not found' }, { status: 404 })
    }
    
    // Update the business's QR code design version
    const { data, error } = await supabase
      .from('businesses')
      .update({ qr_design_version_id: designVersionId })
      .eq('id', business.id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, business: data })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// GET the QR code linked design version
export async function GET() {
  try {
    const { user } = await requireOwner()
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    if (business.qr_design_version_id) {
      const { data: design } = await supabase
        .from('design_versions')
        .select('*')
        .eq('id', business.qr_design_version_id)
        .single()
      
      return NextResponse.json({ designVersionId: business.qr_design_version_id, design })
    }
    
    return NextResponse.json({ designVersionId: null })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
