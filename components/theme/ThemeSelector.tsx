'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTheme } from '@/lib/themes'
import type { Database } from '@/lib/supabase/database.types'

type Theme = Database['public']['Tables']['themes']['Row']

interface ThemeSelectorProps {
  businessId: string
  currentThemeId: string
  themes: Theme[]
}

export default function ThemeSelector({ businessId, currentThemeId, themes }: ThemeSelectorProps) {
  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSelectTheme = async (themeId: string) => {
    setSelectedThemeId(themeId)
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await (supabase
        .from('businesses') as any)
        .update({ theme_id: themeId })
        .eq('id', businessId)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
          Theme updated successfully!
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {themes.map((theme) => {
          const themeConfig = getTheme(theme.id)
          const isSelected = selectedThemeId === theme.id

          return (
            <div
              key={theme.id}
              className={`cursor-pointer rounded-lg border-2 transition ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectTheme(theme.id)}
            >
              <div
                style={{
                  backgroundColor: themeConfig.colors.background,
                  color: themeConfig.colors.text,
                }}
                className={`p-6 rounded-t-lg ${themeConfig.card}`}
              >
                {/* Mini Preview */}
                <div className="space-y-3">
                  {/* Header preview */}
                  <div 
                    className="h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                  >
                    <div 
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    />
                  </div>
                  {/* Card preview */}
                  <div
                    style={{ backgroundColor: themeConfig.colors.secondary }}
                    className={`rounded-lg p-3 border`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div
                          style={{ backgroundColor: themeConfig.colors.text, width: '60px', height: '8px' }}
                          className="rounded"
                        />
                        <div
                          style={{ backgroundColor: themeConfig.colors.muted || themeConfig.colors.accent, width: '80px', height: '6px' }}
                          className="rounded opacity-50"
                        />
                      </div>
                      <div
                        style={{ backgroundColor: themeConfig.colors.primary }}
                        className="rounded px-2 py-1 text-xs text-white font-bold"
                      >
                        $12
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white rounded-b-lg border-t">
                <h3 className="font-semibold text-center capitalize">{theme.name}</h3>
                {isSelected && (
                  <p className="text-sm text-blue-600 text-center mt-2">✓ Selected</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {loading && (
        <div className="mt-4 text-center text-gray-500">Updating theme...</div>
      )}
    </div>
  )
}

