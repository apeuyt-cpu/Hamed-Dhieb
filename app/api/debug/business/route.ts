import { NextResponse } from 'next/server'
import { getBusinessBySlug } from '@/lib/db/business'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    if (!slug) {
      return NextResponse.json({ error: 'missing slug query param' }, { status: 400 })
    }

    const business = await getBusinessBySlug(slug)
    return NextResponse.json({ found: !!business, business })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
