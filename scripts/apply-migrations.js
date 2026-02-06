#!/usr/bin/env node

/**
 * Database Migration Runner
 * Applies pending database migrations to Supabase
 * 
 * Usage: npm run apply-migrations
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const https = require('https')

const sqlFilePath = path.join(__dirname, '../sql/2026-02-06_create_design_versions_table.sql')

console.log('🔄 Scaniha Database Migration Runner')
console.log('=' + '='.repeat(50))

if (!fs.existsSync(sqlFilePath)) {
  console.error(`❌ Migration file not found: ${sqlFilePath}`)
  process.exit(1)
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8')

// Try different methods to apply the migration
async function applyMigration() {
  // Method 1: Try using psql if available
  if (process.platform !== 'win32') {
    const hasPostgres = await checkPostgresExists()
    if (hasPostgres) {
      console.log('\n📦 Found PostgreSQL installation, attempting to apply migration...\n')
      const result = await applyViaPostgres()
      if (result) return true
    }
  }

  // Method 2: Check for Supabase CLI
  const hasSupabaseCli = await checkSupabaseCli()
  if (hasSupabaseCli) {
    console.log('\n📦 Found Supabase CLI, attempting to apply migration...\n')
    const result = await applyViaSupabaseCli()
    if (result) return true
  }

  // Method 3: Provide manual instructions
  console.log('\n⚠️  Automatic migration not available.')
  console.log('📖 Please apply this migration manually:\n')
  
  console.log('Option 1: Supabase Dashboard (Easiest)')
  console.log('  1. Go to https://app.supabase.com')
  console.log('  2. Select your project')
  console.log('  3. SQL Editor → Create new query')
  console.log('  4. Copy the SQL below and paste')
  console.log('  5. Click Run\n')
  
  console.log('Option 2: psql command')
  console.log('  psql "<YOUR_SUPABASE_CONNECTION_STRING>" -f sql/2026-02-06_create_design_versions_table.sql\n')
  
  console.log('Option 3: Supabase CLI')
  console.log('  supabase db push sql/2026-02-06_create_design_versions_table.sql\n')
  
  return false
}

function checkPostgresExists() {
  return new Promise((resolve) => {
    const proc = spawn(process.platform === 'win32' ? 'where' : 'which', ['psql'])
    proc.on('close', (code) => resolve(code === 0))
  })
}

function checkSupabaseCli() {
  return new Promise((resolve) => {
    const proc = spawn(process.platform === 'win32' ? 'where' : 'which', ['supabase'])
    proc.on('close', (code) => resolve(code === 0))
  })
}

function applyViaPostgres() {
  return new Promise((resolve) => {
    const connString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
    
    if (!connString) {
      console.log('⚠️  DATABASE_URL or SUPABASE_DB_URL environment variable not set')
      console.log('   Please set your Supabase connection string in environment variables\n')
      resolve(false)
      return
    }

    const proc = spawn('psql', [connString, '-f', sqlFilePath])
    
    let output = ''
    let errors = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      errors += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Migration applied successfully!')
        console.log(output)
        resolve(true)
      } else {
        console.log('❌ Migration failed')
        if (errors) console.error('Error:', errors)
        resolve(false)
      }
    })

    proc.on('error', (err) => {
      console.log('⚠️  Could not run psql:', err.message)
      resolve(false)
    })
  })
}

function applyViaSupabaseCli() {
  return new Promise((resolve) => {
    const proc = spawn('supabase', ['db', 'push', '--file', sqlFilePath])
    
    let output = ''
    let errors = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      errors += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Migration applied successfully!')
        console.log(output)
        resolve(true)
      } else {
        console.log('❌ Migration failed')
        if (errors) console.error('Error:', errors)
        resolve(false)
      }
    })

    proc.on('error', (err) => {
      console.log('⚠️  Could not run supabase CLI:', err.message)
      resolve(false)
    })
  })
}

// Run the migration
applyMigration().then((success) => {
  if (!success) {
    console.log('\n' + '=' + '='.repeat(50))
    console.log('SQL Migration Content:')
    console.log('=' + '='.repeat(50))
    console.log(sqlContent)
    console.log('=' + '='.repeat(50))
    console.log('\nAfter applying the migration, refresh your app to see the changes.')
  }
})

