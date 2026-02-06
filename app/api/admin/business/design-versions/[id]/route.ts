import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { createServerClient } from '@/lib/supabase/server'

// Helper function to validate UUID format
function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Helper function to validate and extract ID from params
function validateId(id: any): { valid: boolean; error?: string } {
  console.log('[validateId] Received ID:', id)
  console.log('[validateId] ID type:', typeof id)
  console.log('[validateId] ID is nullish:', !id)
  console.log('[validateId] ID === "undefined":', id === 'undefined')
  console.log('[validateId] ID === undefined:', id === undefined)
  console.log('[validateId] ID === null:', id === null)
  
  if (!id || id === 'undefined' || typeof id !== 'string') {
    const errorMsg = `Design ID is required and must be valid. Received: ${JSON.stringify(id)} (type: ${typeof id})`
    console.error('[validateId] VALIDATION FAILED:', errorMsg)
    return { valid: false, error: errorMsg }
  }
  
  if (!validateUUID(id)) {
    const errorMsg = `Invalid UUID format: ${id}`
    console.error('[validateId] UUID validation failed:', errorMsg)
    return { valid: false, error: errorMsg }
  }
  
  console.log('[validateId] VALIDATION PASSED for ID:', id)
  return { valid: true }
}

// GET a specific design version
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[GET /design-versions/[id]] Request received')
    console.log('[GET] Raw params:', params)
    console.log('[GET] params.id:', params.id)
    console.log('[GET] typeof params.id:', typeof params.id)
    
    const idValidation = validateId(params.id)
    if (!idValidation.valid) {
      console.log('[GET] ID validation failed, returning 400')
      return NextResponse.json(
        { error: idValidation.error },
        { status: 400 }
      )
    }
    
    const id = params.id
    
    const { user } = await requireOwner()
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    console.log('[GET] Querying design_versions table for id:', id)
    const { data, error } = await supabase
      .from('design_versions')
      .select('*')
      .eq('id', id)
      .eq('business_id', business.id)
      .single()
    
    if (error) {
      console.error('[GET] Supabase select error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch design' },
        { status: 500 }
      )
    }
    
    if (!data) {
      console.log('[GET] No design found for id:', id)
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }
    
    console.log('[GET] Design found, returning:', data)
    return NextResponse.json({ design: data })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[GET] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a design version
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = validateId(params.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error },
        { status: 400 }
      )
    }
    
    const id = params.id
    const { user } = await requireOwner()
    const body = await request.json()
    const { name, description, design, setAsActive } = body
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    // Verify ownership
    const { data: existing } = await supabase
      .from('design_versions')
      .select('id')
      .eq('id', id)
      .eq('business_id', business.id)
      .single()
    
    if (!existing) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }
    
    // If setAsActive is true, deactivate other designs
    if (setAsActive) {
      await supabase
        .from('design_versions')
        .update({ is_active: false })
        .eq('business_id', business.id)
        .neq('id', id)
    }
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (design !== undefined) updateData.design = design
    if (setAsActive !== undefined) updateData.is_active = setAsActive
    
    const { data, error } = await supabase
      .from('design_versions')
      .update(updateData)
      .eq('id', id)
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

// DELETE - Delete a design version
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = validateId(params.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error },
        { status: 400 }
      )
    }
    
    const id = params.id
    const { user } = await requireOwner()
    
    const business = await getBusinessByOwner(user.id)
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const supabase = await createServerClient()
    
    // Verify ownership
    const { data: existing } = await supabase
      .from('design_versions')
      .select('id, is_active')
      .eq('id', id)
      .eq('business_id', business.id)
      .single() as { data: { id: string; is_active: boolean } | null }
    
    if (!existing) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }
    
    // Don't allow deleting the active design
    if (existing.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete the active design. Activate another design first.' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('design_versions')
      .delete()
      .eq('id', id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: 'Design deleted successfully' })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
