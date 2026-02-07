import { NextResponse } from 'next/server'
import { getBusinessBySlug } from '@/lib/db/business'

// Use a permissive context type to avoid strict Next.js handler typing issues
export async function GET(request: Request, context: any) {
  const slug = context?.params?.slug || null
  if (!slug) {
    return NextResponse.json({ error: 'missing slug param' }, { status: 400 })
  }

  try {
    const business = await getBusinessBySlug(slug)
    return NextResponse.json({ found: !!business, business })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
