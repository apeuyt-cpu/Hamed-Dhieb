#!/usr/bin/env node
const https = require('https')
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ywgunhtmprxaxlwvnkme.supabase.co'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vQZgo2IuosT_hoT87zfGfg_AC2hwE5j'
const slug = process.argv[2] || 'hasta'
const url = new URL(`/rest/v1/businesses?slug=eq.${slug}`, SUPA_URL)

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  headers: {
    apikey: ANON,
    Authorization: `Bearer ${ANON}`
  }
}

https.get(options, (res) => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    console.log('STATUS', res.statusCode)
    try { console.log(JSON.stringify(JSON.parse(d), null, 2)) } catch(e) { console.log(d) }
  })
}).on('error', e => { console.error('ERR', e.message); process.exit(2) })
