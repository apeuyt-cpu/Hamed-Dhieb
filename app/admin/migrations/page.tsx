'use client'

import { useState, useEffect } from 'react'

export default function ApplyMigrationsPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'applying' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [sql, setSql] = useState('')
  const [errorDetails, setErrorDetails] = useState<any>(null)

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  async function checkMigrationStatus() {
    try {
      const res = await fetch('/api/admin/apply-migrations')
      const data = await res.json()
      
      if (res.ok) {
        setSql(data.sql)
        setStatus('ready')
        setMessage('Migration is ready to apply')
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to check migration status')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  async function applyMigration() {
    setStatus('applying')
    setMessage('Applying migration...')
    
    try {
      const res = await fetch('/api/admin/apply-migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        setStatus('success')
        setMessage('✅ Migration applied successfully! Refreshing in 3 seconds...')
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.message || data.error || 'Failed to apply migration')
        setErrorDetails(data)
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Migrations</h1>
        
        {/* Migration Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${
              status === 'success' ? 'bg-green-500' :
              status === 'error' ? 'bg-red-500' :
              status === 'applying' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}></div>
            <h2 className="text-xl font-semibold text-gray-800">
              {status === 'loading' && 'Checking migration status...'}
              {status === 'ready' && 'Migration Ready'}
              {status === 'applying' && 'Applying Migration...'}
              {status === 'success' && 'Migration Applied!'}
              {status === 'error' && 'Error'}
            </h2>
          </div>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          {status === 'ready' && (
            <button
              onClick={applyMigration}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Apply Migration Now
            </button>
          )}
          
          {status === 'applying' && (
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Please wait...</span>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-red-600 font-semibold">Migration requires manual application</p>
              <p className="text-gray-600">Use one of these methods:</p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Method 1: Supabase Dashboard (Easiest)</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                  <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://app.supabase.com</a></li>
                  <li>Select your project</li>
                  <li>Click SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Copy the SQL below and paste it</li>
                  <li>Click Run</li>
                </ol>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Method 2: CLI Commands</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Supabase CLI:</p>
                    <code className="block bg-gray-800 text-gray-100 p-2 rounded text-xs mt-1 overflow-auto">
                      supabase db push sql/2026-02-06_create_design_versions_table.sql
                    </code>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">psql:</p>
                    <code className="block bg-gray-800 text-gray-100 p-2 rounded text-xs mt-1 overflow-auto">
                      psql "&lt;CONNECTION_STRING&gt;" -f sql/2026-02-06_create_design_versions_table.sql
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* SQL Content */}
        {sql && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Migration SQL</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-xs" style={{ maxHeight: '400px' }}>
              {sql}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sql)
                alert('SQL copied to clipboard!')
              }}
              className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Copy SQL to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
