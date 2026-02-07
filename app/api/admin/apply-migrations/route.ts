import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET: Check migration status and display SQL
 * POST: Apply the migration to the database
 */
export async function GET() {
  try {
    const { user, profile } = await requireSuperAdmin()
    
    // Check for the latest migration files
    const migrations = [
      {
        file: 'sql/2026-02-06_create_design_versions_table.sql',
        description: 'Creates design_versions table for managing design versions per business'
      },
      {
        file: 'sql/2026-02-07_add_qr_design_version_to_businesses.sql',
        description: 'Adds qr_design_version_id column to businesses table'
      }
    ]
    
    const pendingMigrations = migrations
      .filter(m => fs.existsSync(path.join(process.cwd(), m.file)))
      .map(m => ({
        ...m,
        content: fs.readFileSync(path.join(process.cwd(), m.file), 'utf-8')
      }))
    
    if (pendingMigrations.length === 0) {
      return NextResponse.json({ 
        status: 'error',
        message: 'No migration files found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({
      status: 'pending',
      pendingMigrations: pendingMigrations,
      instructions: {
        manual: 'Use POST to apply migrations, or copy SQL from above and run in Supabase Dashboard'
      }
    })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: err.message || 'Failed to check migration status' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { user, profile } = await requireSuperAdmin()
    
    // List of migration files to apply (in order)
    const migrationFiles = [
      'sql/2026-02-06_create_design_versions_table.sql',
      'sql/2026-02-07_add_qr_design_version_to_businesses.sql'
    ]
    
    const appliedMigrations = []
    const failedMigrations = []
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(process.cwd(), migrationFile)
      
      if (!fs.existsSync(migrationPath)) {
        continue // Skip if file doesn't exist
      }
      
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
      
      try {
        // Create a service role client to execute SQL
        const supabase = await createServiceRoleClient()
        
        // Try to execute via RPC
        const { error: rpcError } = await (supabase as any).rpc('exec_sql', {
          sql: sqlContent
        })
        
        if (rpcError && rpcError.code !== '42883') {
          throw rpcError
        }
        
        appliedMigrations.push(migrationFile)
      } catch (sqlError: any) {
        failedMigrations.push({
          file: migrationFile,
          sql: sqlContent,
          error: sqlError.message
        })
      }
    }
    
    // If there are failed migrations, provide instructions
    if (failedMigrations.length > 0) {
      return NextResponse.json({
        status: 'manual_application_required',
        message: 'Some migrations require manual execution',
        appliedMigrations,
        pendingMigrations: failedMigrations.map(m => ({
          file: m.file,
          sql: m.sql,
          error: m.error
        })),
        instructions: {
          'Supabase Dashboard': {
            steps: [
              '1. Open https://app.supabase.com in your browser',
              '2. Select your project (ywgunhtmprxaxlwvnkme)',
              '3. Go to SQL Editor in the left sidebar',
              '4. Click "Create a new query"',
              '5. Copy each SQL statement below and paste it',
              '6. Click "Run" after each statement',
              '7. Wait for success message'
            ],
            difficulty: 'Easy - Recommended'
          }
        }
      }, { status: 400 })
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'All migrations applied successfully',
      appliedMigrations
    })
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ 
      error: err.message || 'Failed to apply migrations',
      status: 'error'
    }, { status: 500 })
  }
}
