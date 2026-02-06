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
    
    const { status } = await request.json()
    
    if (status !== 'active' && status !== 'paused') {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()
    
    // Use type assertion to work around Supabase type inference issue
    const updatePayload = { status: status as 'active' | 'paused' }
    const { data, error } = await (supabase
      .from('businesses') as any)
      .update(updatePayload)
      .eq('id', resolvedParams.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}

