#!/usr/bin/env node

/**
 * Database Seed Script
 * Automatically inserts sample business data into Supabase
 * 
 * Usage: npm run seed
 * 
 * This script:
 * 1. Checks if business with slug 'hasta' exists
 * 2. If not, creates it automatically
 * 3. Sets up initial design_selections for the business
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })

const https = require('https')

// Configuration - update these with your details
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Default owner ID - use the first owner or create a test owner
// If you have a specific owner, update this
const DEFAULT_OWNER_ID = process.env.SEED_OWNER_ID || 'seed-owner-001'

console.log('🌱 Scaniha Database Seed Script')
console.log('=' + '='.repeat(50))

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env.local file\n')
  process.exit(1)
}

console.log(`✓ Supabase URL: ${SUPABASE_URL}`)
console.log(`✓ Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`)
console.log(`✓ Owner ID: ${DEFAULT_OWNER_ID}\n`)

/**
 * Make an HTTP request to Supabase API
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    const options = {
      hostname: url.hostname,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=representation'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

/**
 * Check if business with slug 'hasta' exists
 */
async function checkBusinessExists() {
  console.log('🔍 Checking if business with slug "hasta" exists...')
  
  try {
    const response = await makeRequest('GET', `/rest/v1/businesses?slug=eq.hasta&select=id,slug,status`)
    
    if (response.status === 200 && response.data && response.data.length > 0) {
      console.log(`✓ Business found!`)
      console.log(`  ID: ${response.data[0].id}`)
      console.log(`  Status: ${response.data[0].status}`)
      return response.data[0]
    } else {
      console.log('✗ Business not found, will create it\n')
      return null
    }
  } catch (error) {
    console.error('❌ Error checking business:', error.message)
    return null
  }
}

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Create the business record
 */
async function createBusiness() {
  const businessId = generateUUID()
  
  const businessData = {
    id: businessId,
    owner_id: DEFAULT_OWNER_ID,
    name: 'Hasta Restaurant',
    slug: 'hasta',
    theme_id: 'minimal',
    status: 'active',
    primary_color: '#E85D04',
    logo_url: null,
    expires_at: null,
    facebook_url: null,
    instagram_url: null,
    twitter_url: null,
    whatsapp_number: null,
    website_url: null,
    design: null,
    qr_design_version_id: null,
    created_at: new Date().toISOString()
  }

  console.log('📝 Creating business record...')
  console.log(`   Name: ${businessData.name}`)
  console.log(`   Slug: ${businessData.slug}`)
  console.log(`   ID: ${businessId}\n`)

  try {
    const response = await makeRequest('POST', '/rest/v1/businesses', businessData)
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✓ Business created successfully!')
      return businessId
    } else {
      console.error(`❌ Failed to create business (${response.status}):`, response.data)
      return null
    }
  } catch (error) {
    console.error('❌ Error creating business:', error.message)
    return null
  }
}

/**
 * Create design_selections record for the business
 */
async function createDesignSelection(businessId) {
  const selectionData = {
    id: generateUUID(),
    business_id: businessId,
    design_type: 'normal',
    description: null,
    created_at: new Date().toISOString()
  }

  console.log('📝 Creating design_selections record...\n')

  try {
    const response = await makeRequest('POST', '/rest/v1/design_selections', selectionData)
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✓ Design selection created successfully!')
      return true
    } else {
      console.error(`❌ Failed to create design_selections (${response.status}):`, response.data)
      return false
    }
  } catch (error) {
    console.error('❌ Error creating design_selections:', error.message)
    return false
  }
}

/**
 * Main seed function
 */
async function seedDatabase() {
  try {
    // Check if business exists
    let business = await checkBusinessExists()
    
    let businessId
    if (!business) {
      // Create business
      businessId = await createBusiness()
      if (!businessId) {
        console.error('\n❌ Failed to create business')
        process.exit(1)
      }
    } else {
      businessId = business.id
      console.log('')
    }

    // Create design_selections
    const selectionCreated = await createDesignSelection(businessId)
    if (!selectionCreated) {
      console.warn('\n⚠️  Warning: Design selection creation had issues')
    }

    console.log('\n' + '='.repeat(52))
    console.log('✅ Database seeding completed!')
    console.log('='.repeat(52))
    console.log(`\n🌍 Your menu should now be accessible at:`)
    console.log(`   https://hamed-dhie.vercel.app/hasta`)
    console.log(`   Or on your custom domain: https://yourdomian.com/hasta\n`)

  } catch (error) {
    console.error('\n❌ Seed script failed:', error.message)
    process.exit(1)
  }
}

// Run the seed
seedDatabase()
