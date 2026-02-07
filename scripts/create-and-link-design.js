#!/usr/bin/env node

// Creates a design_version for business slug 'hasta' and links it to the business
// Usage: node scripts/create-and-link-design.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !API_KEY) {
  console.error('Missing SUPABASE_URL or API_KEY in .env.local')
  process.exit(1)
}

function request(method, path, body=null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    const options = {
      hostname: url.hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'apikey': API_KEY,
        'Prefer': 'return=representation'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const parsed = data ? (() => { try { return JSON.parse(data) } catch(e){ return data } })() : null
        resolve({ status: res.statusCode, body: parsed })
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

;(async () => {
  try {
    console.log('1) Fetching business id for slug=\'hasta\'')
    const res1 = await request('GET', '/rest/v1/businesses?slug=eq.hasta&select=id,slug,status,owner_id')
    if (res1.status !== 200) {
      console.error('Failed to fetch business:', res1.status, res1.body)
      process.exit(1)
    }
    const business = Array.isArray(res1.body) && res1.body[0]
    if (!business || !business.id) {
      console.error('Business not found for slug=\'hasta\'')
      process.exit(1)
    }
    const businessId = business.id
    const ownerId = business.owner_id || null
    console.log('Found business id:', businessId, 'status:', business.status, 'owner_id:', ownerId)

    console.log('\n2) Creating design_version')
    const designPayload = {
      business_id: businessId,
      name: 'Automated Test Design',
      description: 'Created by script to verify linking',
      design: {
        headerTitle: 'Hasta - AutoDesign',
        logo: null,
        background: '#ffffff',
        accentColor: '#E85D04'
      },
      is_active: false,
      created_by: ownerId
    }

    const res2 = await request('POST', '/rest/v1/design_versions', designPayload)
    if (res2.status < 200 || res2.status >= 300) {
      console.error('Failed to create design_version:', res2.status, res2.body)
      process.exit(1)
    }
    const created = Array.isArray(res2.body) ? res2.body[0] : res2.body
    const designId = created?.id
    console.log('Design version created with id:', designId)

    console.log('\n3) Linking design to business (patch business record)')
    const patchBody = {
      qr_design_version_id: designId,
      design: designPayload.design
    }

    const res3 = await request('PATCH', `/rest/v1/businesses?id=eq.${businessId}`, patchBody)
    if (res3.status < 200 || res3.status >= 300) {
      console.error('Failed to patch business:', res3.status, res3.body)
      process.exit(1)
    }
    console.log('Business patched successfully. Response:', res3.body)

    console.log('\nDone. You can now open the public menu to verify: https://hamed-dhie.vercel.app/hasta')
  } catch (err) {
    console.error('Script error:', err)
    process.exit(1)
  }
})()
