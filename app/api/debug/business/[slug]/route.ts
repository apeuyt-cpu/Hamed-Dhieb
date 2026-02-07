import { NextResponse } from 'next/server'
import { getBusinessBySlug } from '@/lib/db/business'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const business = await getBusinessBySlug(params.slug)
    return NextResponse.json({ found: !!business, business })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
