'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadBusinessLogo } from '@/lib/storage'

interface LogoUploadProps {
  businessId: string
  currentLogoUrl?: string | null
  onLogoUpdated?: (logoUrl: string) => void
  compact?: boolean
}

export default function LogoUpload({ businessId, currentLogoUrl, onLogoUpdated, compact }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)
  const supabase = createClient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const logoUrl = await uploadBusinessLogo(businessId, file)

      const { error: updateError } = await (supabase
        .from('businesses') as any)
        .update({ logo_url: logoUrl })
        .eq('id', businessId)

      if (updateError) throw updateError

      setPreview(logoUrl)
      onLogoUpdated?.(logoUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  // Compact mode for dashboard
  if (compact) {
    return (
      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <span className={`px-3 py-1.5 text-sm lg:text-base font-medium rounded-xl transition-colors ${
          uploading 
            ? 'bg-zinc-200 text-zinc-400' 
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
        }`}>
          {uploading ? 'جاري الرفع...' : preview ? 'تغيير' : 'رفع'}
        </span>
      </label>
    )
  }

  // Full mode for settings page
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Business Logo</label>
      
      <div className="flex items-center gap-6">
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt="Business logo" 
              className="h-24 w-24 object-contain rounded-lg border-2 border-gray-200"
            />
            <button
              onClick={async () => {
                if (!confirm('Remove logo?')) return
                setUploading(true)
                try {
                  const { error } = await (supabase.from('businesses') as any)
                    .update({ logo_url: null })
                    .eq('id', businessId)
                  if (error) throw error
                  setPreview(null)
                  onLogoUpdated?.('')
                } catch (err: any) {
                  setError(err.message || 'Failed to remove logo')
                } finally {
                  setUploading(false)
                }
              }}
              disabled={uploading}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="flex-1">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-block font-medium text-sm">
              {uploading ? 'Uploading...' : preview ? 'Change Logo' : 'Upload Logo'}
            </div>
          </label>
          <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
