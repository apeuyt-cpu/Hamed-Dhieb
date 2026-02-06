'use client'

import { useState } from 'react'
import LogoUpload from '@/components/business/LogoUpload'
import BusinessSettings from '@/components/business/BusinessSettings'

interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export default function SettingsSection({ 
  business, 
  onUpdate 
}: { 
  business: Business
  onUpdate: () => void
}) {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage your business information and branding</p>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Logo</h3>
          <LogoUpload 
            businessId={business.id} 
            currentLogoUrl={business.logo_url}
            onLogoUpdated={onUpdate}
          />
        </div>

        <BusinessSettings business={business} />
      </div>
    </div>
  )
}

