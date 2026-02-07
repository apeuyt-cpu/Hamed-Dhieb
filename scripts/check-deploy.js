#!/usr/bin/env node
const https = require('https')

const TOKEN = process.argv[2]
const PROJECT_ID = process.argv[3]

if (!TOKEN || !PROJECT_ID) {
  console.error('Usage: node scripts/check-deploy.js <VC_TOKEN> <PROJECT_ID>')
  process.exit(1)
}

function api(path) {
  const options = {
    hostname: 'api.vercel.com',
    path,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  }
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve({ status: res.statusCode, body: parsed })
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

(async () => {
  try {
    const res = await api(`/v13/projects/${PROJECT_ID}/deployments`)
    console.log('HTTP', res.status)
    console.log(JSON.stringify(res.body, null, 2))
  } catch (e) {
    console.error('Error', e)
    process.exit(1)
  }
})()
