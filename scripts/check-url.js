#!/usr/bin/env node
const https = require('https')
const url = process.argv[2]
if (!url) {
  console.error('Usage: node scripts/check-url.js <url>')
  process.exit(1)
}

https.get(url, (res) => {
  console.log('STATUS', res.statusCode)
  let data = ''
  res.on('data', (c) => data += c)
  res.on('end', () => {
    console.log('LENGTH', data.length)
    console.log(data.slice(0, 800))
  })
}).on('error', (e) => {
  console.error('ERR', e.message)
  process.exit(2)
})
