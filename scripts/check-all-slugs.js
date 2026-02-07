#!/usr/bin/env node
const https = require('https')
const { URL } = require('url')

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ywgunhtmprxaxlwvnkme.supabase.co'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vQZgo2IuosT_hoT87zfGfg_AC2hwE5j'
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://hamed-dhie.vercel.app'

function rest(path) {
  const u = new URL(path, SUPA)
  const options = {
    hostname: u.hostname,
    path: u.pathname + u.search,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`
    }
  }
  return new Promise((resolve, reject) => {
    https.get(options, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

function httpGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      res.on('data', () => {})
      res.on('end', () => resolve(res.statusCode))
    }).on('error', () => resolve(null))
  })
}

(async () => {
  try {
    console.log('Fetching businesses from Supabase...')
    const res = await rest('/rest/v1/businesses?select=slug,status')
    const businesses = res.body || []
    console.log(`Found ${businesses.length} businesses`)

    const results = []
    for (const b of businesses) {
      const slug = b.slug
      const url = `${BASE.replace(/\/$/, '')}/${slug}`
      const status = await httpGet(url)
      results.push({ slug, status, businessStatus: b.status })
      console.log(slug, status || 'ERR', `(${b.status})`)
    }

    const failures = results.filter(r => r.status !== 200)
    console.log('\nSummary:')
    console.log('Total:', results.length)
    console.log('OK:', results.length - failures.length)
    console.log('Fail:', failures.length)
    if (failures.length) console.log('Failed slugs:', failures.map(f => `${f.slug} (http:${f.status})`).join(', '))
  } catch (e) {
    console.error('Error checking slugs:', e)
    process.exit(1)
  }
})()
