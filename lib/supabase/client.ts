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

  // During build/prerendering, if env vars are missing, return a dummy client
  // that won't be used anyway since pages marked as force-dynamic won't execute
  if (!url || !key) {
    // Create a client with dummy values to avoid errors during build
    clientInstance = createBrowserClient<Database>(
      url || 'https://dummy.supabase.co',
      key || 'dummy-key'
    )
    return clientInstance
  }

  clientInstance = createBrowserClient<Database>(
    url,
    key
  )

  return clientInstance
}

