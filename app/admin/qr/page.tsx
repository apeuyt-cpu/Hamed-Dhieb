import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import QRCodeDisplay from '@/components/qr/QRCodeDisplay'

export default async function QRCodePage() {
  const { user } = await requireOwner()
  const business = await getBusinessByOwner(user.id)

  if (!business) {
    return <div>Business not found</div>
  }

  const menuUrl = `${process.env.NEXT_PUBLIC_MENU_URL || 'https://menu.myowndomain.com'}/${business.slug}`

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">QR Code</h1>
        <p className="mt-2 text-gray-600">
          Download your QR code to display in your restaurant.
        </p>
      </div>

      <QRCodeDisplay url={menuUrl} businessName={business.name} />
    </div>
  )
}

