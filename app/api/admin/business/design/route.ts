import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { user } = await requireOwner()
    const body = await request.json()
    const { design } = body

    if (!design) {
      return NextResponse.json({ error: 'Design JSON is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data, error } = await (supabase.from('businesses') as any)
      .update({ design })
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) {
      const msg = error.message || 'Failed to save design'

      // In development, allow a local fallback so the editor can be tested without the DB.
      if (process.env.NODE_ENV === 'development') {
        try {
          const fs = await import('fs/promises')
            const filePath = `.local-dev-design-${user.id}.json`
            await fs.writeFile(
              filePath,
              JSON.stringify({ owner_id: user.id, design, saved_at: new Date().toISOString(), dbError: msg }, null, 2),
              'utf8'
            )
            // Also write a global fallback file for previewing the public menu without DB
            try {
              const globalPath = `.local-dev-design.json`
              await fs.writeFile(globalPath, JSON.stringify({ owner_id: user.id, design, saved_at: new Date().toISOString() }, null, 2), 'utf8')
            } catch (globalFsErr) {
              console.warn('Failed to write global local-dev-design.json fallback:', globalFsErr)
            }
          return NextResponse.json({ success: true, business: { id: 'local', owner_id: user.id, design, saved_local_path: filePath } })
        } catch (fsErr) {
          // If writing the file fails, continue to return the DB error below.
          console.error('Failed to write local design fallback:', fsErr)
        }
      }

      // Common cause: the `design` column doesn't exist in the database schema.
      if (typeof msg === 'string' && msg.includes("Could not find the 'design' column")) {
        return NextResponse.json({
          error:
            "Database schema missing 'design' column on 'businesses'. Run: ALTER TABLE businesses ADD COLUMN design JSONB;"
        }, { status: 500 })
      }

      return NextResponse.json({ error: msg }, { status: 500 })
    }
    
    // NEW: Also create a design version for the new design-versions system
    // This ensures the design is indexed and can be linked to QR codes
    if (data && data.id) {
      try {
        // Create a design version with auto-generated name
        const { data: designVersion } = await supabase
          .from('design_versions')
          .insert({
            business_id: data.id,
            name: `Version ${new Date().toLocaleTimeString('ar-SA')}`,
            description: 'Auto-saved from design editor',
            design,
            is_active: true,
            created_by: user.id
          })
          .select()
          .single()
        
        // Also link this to QR code
        if (designVersion && designVersion.id) {
          await (supabase.from('businesses') as any)
            .update({ qr_design_version_id: designVersion.id })
            .eq('id', data.id)
        }
      } catch (versionErr) {
        // Log error but don't fail - design is already saved in business.design
        console.warn('Failed to create design version:', versionErr)
      }
    }

    return NextResponse.json({ success: true, business: data })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
