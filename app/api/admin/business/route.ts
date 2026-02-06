import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { createServerClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'

export async function GET() {
  try {
    // requireOwner already ensures user is owner and redirects super_admin
    const { user } = await requireOwner()
    
    // Get business owned by this user only
    const business = await getBusinessByOwner(user.id)

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    // Verify the business actually belongs to this user (extra security check)
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Business does not belong to this user' },
        { status: 403 }
      )
    }

    // Don't auto-pause here - owners should always access their dashboard
    // Return business as-is, even if expired - dashboard will show warning
    return NextResponse.json(business)
  } catch (error: any) {
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // requireOwner already ensures user is owner and redirects super_admin
    const { user } = await requireOwner()
    
    const { businessName } = await request.json()

    if (!businessName || !businessName.trim()) {
      return NextResponse.json(
        { error: 'اسم النشاط التجاري مطلوب' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const slug = generateSlug(businessName.trim())

    // Prevent using reserved slugs
    if (slug === 'super-admin' || slug === 'admin' || slug === 'login' || slug === 'signup') {
      return NextResponse.json(
        { error: 'هذا الاسم محجوز ولا يمكن استخدامه. يرجى اختيار اسم آخر.' },
        { status: 400 }
      )
    }

    // Check if business name already exists
    const { data: existingBusinessName } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('name', businessName.trim())
      .maybeSingle()

    if (existingBusinessName) {
      return NextResponse.json(
        { error: 'اسم النشاط التجاري مستخدم بالفعل. يرجى اختيار اسم آخر.' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existingSlug } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      return NextResponse.json(
        { error: 'اسم النشاط التجاري يُنشئ رابط مستخدم بالفعل. يرجى اختيار اسم آخر.' },
        { status: 400 }
      )
    }

    // Create business with 7-day free trial
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 7) // 7 days from now

    const { data: business, error: businessError } = await (supabase
      .from('businesses') as any)
      .insert({
        owner_id: user.id,
        name: businessName.trim(),
        slug: slug,
        expires_at: expirationDate.toISOString(),
        status: 'active'
      })
      .select('id')
      .single()

    if (businessError) {
      if (businessError.code === '23505') {
        return NextResponse.json(
          { error: 'اسم النشاط التجاري مستخدم بالفعل. يرجى اختيار اسم آخر.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: businessError.message || 'فشل إنشاء النشاط التجاري' },
        { status: 500 }
      )
    }

    return NextResponse.json(business)
  } catch (error: any) {
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
