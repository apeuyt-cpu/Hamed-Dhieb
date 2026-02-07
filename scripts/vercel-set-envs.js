#!/usr/bin/env node

// Usage: set VC_TOKEN env var or pass token as first arg and run this script
// Examples:
//   PowerShell: $env:VC_TOKEN='your_token'; node scripts/vercel-set-envs.js
//   CMD / Bash: node scripts/vercel-set-envs.js your_token

const https = require('https')

const TOKEN = process.env.VC_TOKEN || process.argv[2]
if (!TOKEN) {
  console.error('Missing VC_TOKEN env var')
  process.exit(1)
}

const fs = require('fs')
const SUPABASE_URL = 'https://ywgunhtmprxaxlwvnkme.supabase.co'
const SUPABASE_ANON = 'sb_publishable_vQZgo2IuosT_hoT87zfGfg_AC2hwE5j'
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const envLocal = fs.readFileSync('.env.local', 'utf8')
    const m = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
    if (m) SUPABASE_SERVICE_ROLE_KEY = m[1].trim()
  } catch (e) {
    // ignore
  }
}

function api(path, method = 'GET', body = null) {
  const options = {
    hostname: 'api.vercel.com',
    path,
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, body: parsed })
          } else {
            resolve(parsed)
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

;(async () => {
  try {
    console.log('Listing Vercel projects...')
    const projectsRaw = await api('/v9/projects')
    let projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw.projects || projectsRaw.items || [])
    if (!Array.isArray(projects) || projects.length === 0) {
      console.error('Unexpected projects response from Vercel API:', projectsRaw)
    }
    // Try to find project by name or alias
    let project = projects.find(p => p.name === 'hamed-dhie' || p.name === 'hamed-dhie-vercel')
    if (!project) {
      // Fallback: find by alias
      project = projects.find(p => (p.aliases || []).some(a => a.includes('hamed-dhie.vercel.app')))
    }

    if (!project) {
      // If not found, show candidates and exit
      console.error('Project "hamed-dhie" not found in your Vercel account. Projects available:')
      console.error(projects.map(p => `${p.name} (id: ${p.id})`).join('\n'))
      process.exit(1)
    }

    const projectId = project.id
    console.log('Found project:', project.name, projectId)

    // Create env vars
    const envs = [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL, target: ['production'], type: 'encrypted' },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON, target: ['production'], type: 'encrypted' }
    ]
    if (SUPABASE_SERVICE_ROLE_KEY) {
      envs.push({ key: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_ROLE_KEY, target: ['production'], type: 'encrypted' })
    } else {
      console.warn('No SUPABASE_SERVICE_ROLE_KEY found in env or .env.local; server-side requests may fail')
    }

    for (const e of envs) {
      try {
        console.log('Creating env var', e.key)
        await api(`/v9/projects/${projectId}/env`, 'POST', e)
        console.log('Created', e.key)
      } catch (err) {
        // If variable exists, update it
        console.warn('Create failed for', e.key, '— attempting update or skip:', err && err.body ? JSON.stringify(err.body) : err)
        // Try to find existing env var id
        try {
          const existingRaw = await api(`/v9/projects/${projectId}/env`)
          const existing = Array.isArray(existingRaw) ? existingRaw : (existingRaw.envs || existingRaw.items || [])
          const found = existing.find(v => v.key === e.key)
          if (found) {
            console.log('Updating existing env var', e.key)
            await api(`/v9/projects/${projectId}/env/${found.id}`, 'PATCH', { value: e.value })
            console.log('Updated', e.key)
          } else {
            console.warn('Env var not found to update for', e.key)
          }
        } catch (innerErr) {
          console.error('Failed to list/update env vars:', innerErr)
        }
      }
    }

    // Trigger redeploy: get latest production deployment
    console.log('Fetching latest production deployment...')
    const deployments = await api(`/v13/projects/${projectId}/deployments?limit=1&target=production`)
    const latest = deployments && deployments[0]
    if (!latest || !latest.uid) {
      console.error('No production deployments found to redeploy. You may need to trigger a deploy manually from Vercel dashboard.')
      process.exit(1)
    }

    const depId = latest.uid || latest.id || latest._id
    console.log('Latest deployment id:', depId)

    console.log('Triggering redeploy...')
    const redeploy = await api(`/v13/deployments/${depId}/retries`, 'POST', {})
    console.log('Redeploy triggered:', redeploy)
    console.log('Done — Vercel will deploy with the new environment variables shortly.')
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
})()
