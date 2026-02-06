import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin()
    
    const supabase = await createServiceRoleClient()
    const adminClient = supabase as any
    
    const diagnostics: any = {
      serviceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      adminApiAvailable: false,
      listUsersWorks: false,
      getUserByIdWorks: false,
      errors: []
    }
    
    // Test if admin API is available
    if (adminClient.auth && adminClient.auth.admin) {
      diagnostics.adminApiAvailable = true
      
      // Test listUsers
      try {
        const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 })
        if (!error) {
          diagnostics.listUsersWorks = true
          diagnostics.userCount = data?.users?.length || 0
        } else {
          diagnostics.errors.push(`listUsers: ${error.message}`)
        }
      } catch (err: any) {
        diagnostics.errors.push(`listUsers exception: ${err.message}`)
      }
      
      // Test getUserById with a dummy ID (will fail but shows if method exists)
      try {
        const testId = '00000000-0000-0000-0000-000000000000'
        const { error } = await adminClient.auth.admin.getUserById(testId)
        // Even if it fails, if we get here the method exists
        diagnostics.getUserByIdWorks = true
        if (error && !error.message.includes('not found')) {
          diagnostics.errors.push(`getUserById test: ${error.message}`)
        }
      } catch (err: any) {
        diagnostics.errors.push(`getUserById exception: ${err.message}`)
      }
    }
    
    return NextResponse.json(diagnostics)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

