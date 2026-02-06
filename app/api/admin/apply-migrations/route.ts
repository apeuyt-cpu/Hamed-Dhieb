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
    
    // Check if migration file exists
    const migrationPath = path.join(process.cwd(), 'sql/2026-02-06_create_design_versions_table.sql')
    const exists = fs.existsSync(migrationPath)
    
    if (!exists) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Migration file not found' 
      }, { status: 404 })
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
    
    return NextResponse.json({
      status: 'pending',
      migration: '2026-02-06_create_design_versions_table',
      table: 'design_versions',
      description: 'Creates design_versions table for managing design versions per business',
      sql: sqlContent,
      instructions: {
        manual: 'Use GET to retrieve SQL, then apply via Supabase Dashboard or POST to apply programmatically'
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
    
    const migrationPath = path.join(process.cwd(), 'sql/2026-02-06_create_design_versions_table.sql')
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        status: 'file_not_found'
      }, { status: 404 })
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
    
    // Create a service role client to execute SQL
    const supabase = await createServiceRoleClient()
    
    // Split SQL into individual statements and execute them
    // We'll use the exec_sql RPC function if it exists, otherwise create it
    try {
      // Try direct execution via RPC
      const { error: rpcError, data: rpcData } = await (supabase as any).rpc('exec_sql', {
        sql: sqlContent
      })
      
      if (rpcError && rpcError.code !== '42883') { // 42883 = function doesn't exist
        throw rpcError
      }
      
      // If function doesn't exist, try a different approach
      if (rpcError?.code === '42883') {
        // Execute statements individually
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))
        
        // Create the extension
        const { error: extError } = await (supabase as any).rpc('exec', {
          sql: 'CREATE EXTENSION IF NOT EXISTS "pgcrypto"'
        }).catch(() => ({ error: null })) // Ignore if function doesn't exist
        
        // Execute create table statement
        const createTableStmt = statements
          .find(s => s.toUpperCase().startsWith('CREATE TABLE'))
        
        if (createTableStmt) {
          const { error: createError } = await (supabase as any).rpc('exec', {
            sql: createTableStmt
          }).catch(() => ({ error: null }))
        }
        
        throw new Error('SQL execution requires Supabase dashboard or CLI. Please use the manual instructions below.')
      }
      
      return NextResponse.json({
        success: true,
        message: 'Migration applied successfully',
        migration: '2026-02-06_create_design_versions_table',
        status: 'completed'
      })
    } catch (sqlError: any) {
      // If direct execution fails, provide detailed instructions
      return NextResponse.json({
        status: 'manual_application_required',
        error: sqlError.message || 'Database SQL execution not available through API',
        message: 'Please apply the migration using one of these methods:',
        sql: sqlContent,
        methods: {
          'Supabase Dashboard': {
            steps: [
              'Open https://app.supabase.com in your browser',
              'Select your project',
              'Go to SQL Editor',
              'Click "Create a new query"',
              'Copy and paste the SQL from the "sql" field above',
              'Click "Run"',
              'Wait for success message'
            ],
            difficulty: 'Easy'
          },
          'Supabase CLI': {
            command: 'supabase db push sql/2026-02-06_create_design_versions_table.sql',
            requires: 'Supabase CLI installed and authenticated',
            difficulty: 'Medium'
          },
          'psql CLI': {
            command: 'psql "<SUPABASE_CONNECTION_URL>" -f sql/2026-02-06_create_design_versions_table.sql',
            requires: 'PostgreSQL client installed',
            difficulty: 'Medium'
          }
        }
      }, { status: 400 })
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ 
      error: err.message || 'Failed to apply migration',
      status: 'error'
    }, { status: 500 })
  }
}
