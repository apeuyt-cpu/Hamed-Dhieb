import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()
    
    const supabase = await createServiceRoleClient()
    
    // First, get the business to check if it exists and get logo_url for cleanup
    const { data: business, error: fetchError } = await (supabase
      .from('businesses') as any)
      .select('id, logo_url, owner_id')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Clean up storage files if they exist
    try {
      // Delete logo if exists
      if (business.logo_url) {
        const logoPath = business.logo_url.includes('menu-images/')
          ? business.logo_url.split('menu-images/')[1]
          : `${business.id}/logo.${business.logo_url.split('.').pop()}`
        
        await supabase.storage
          .from('menu-images')
          .remove([logoPath])
      }

      // Delete all files in the business folder (logo, items, categories)
      const { data: files } = await supabase.storage
        .from('menu-images')
        .list(business.id, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${business.id}/${file.name}`)
        await supabase.storage
          .from('menu-images')
          .remove(filePaths)
      }

      // Also clean up any item/category images that might be in subfolders
      // Items are stored as items/{itemId}-{timestamp}.{ext}
      // Categories are stored as categories/{categoryId}-{timestamp}.{ext}
      // We'll let the cascade delete handle the database cleanup, but we should
      // try to clean up orphaned files if possible
    } catch (storageError: any) {
      // Log storage errors but don't fail the deletion
      // Storage cleanup is best-effort
      console.warn('Storage cleanup warning:', storageError.message)
    }

    // Delete the business (this will cascade delete categories, items, subscriptions)
    const { error: deleteError } = await (supabase
      .from('businesses') as any)
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete business' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Business deleted successfully' 
    })
  } catch (error: any) {
    console.error('Delete business error:', error)
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

