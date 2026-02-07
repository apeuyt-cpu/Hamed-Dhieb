import { NextResponse } from 'next/server'

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    environment: process.env.NODE_ENV,
    status: (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'HEALTHY' : 'MISSING_CONFIG',
    instructions: 'If environment variables are NOT SET, configure them in Vercel project settings. See VERCEL_SETUP.md for details.'
  }

  return NextResponse.json(diagnostics)
}
