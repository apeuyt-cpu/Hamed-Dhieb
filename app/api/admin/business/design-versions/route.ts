import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { createServerClient } from '@/lib/supabase/server'

// GET all design versions for the business
export async function GET() {
  try {
    const { user } = await requireOwner()
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from('design_versions')
      .select('id, name, description, is_active, created_at, updated_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('Designs returned from Supabase:', data)
    
    // Ensure data has IDs
    if (data && data.length > 0) {
      data.forEach((design: any, index: number) => {
        if (!design.id) {
          console.warn(`Design at index ${index} missing ID:`, design)
        }
      })
    }
    
    return NextResponse.json({ designs: data || [] })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('GET design-versions error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new design version
export async function POST(request: Request) {
  try {
    const { user } = await requireOwner()
    const body = await request.json()
    const { name, description, design, setAsActive } = body
    
    if (!name || !design) {
      return NextResponse.json({ error: 'Name and design are required' }, { status: 400 })
    }
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    // If setAsActive is true, deactivate other designs
    if (setAsActive) {
      await (supabase as any)
        .from('design_versions')
        .update({ is_active: false })
        .eq('business_id', business.id)
    }
    
    const { data, error } = await (supabase as any)
      .from('design_versions')
      .insert({
        business_id: business.id,
        name,
        description: description || null,
        design,
        is_active: setAsActive || false,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, design: data })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
