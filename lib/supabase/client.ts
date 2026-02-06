'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Return existing instance if available (singleton pattern)
  if (clientInstance) {
    return clientInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  clientInstance = createBrowserClient<Database>(
    url,
    key
  )

  return clientInstance
}

