import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import LogoUpload from '@/components/business/LogoUpload'
import BusinessSettings from '@/components/business/BusinessSettings'

export default async function SettingsPage() {
  const { user } = await requireOwner()
  const business = await getBusinessByOwner(user.id)

  if (!business) {
    return <div>Business not found</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Business Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your business information and branding.
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-6">Logo</h2>
          <LogoUpload businessId={business.id} currentLogoUrl={business.logo_url} />
        </div>

        <BusinessSettings business={business} />
      </div>
    </div>
  )
}

