import { requireSuperAdmin } from '@/lib/auth'
import { getAllBusinesses } from '@/lib/db/business'
import BusinessList from '@/components/super-admin/BusinessList'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SuperAdminDashboard() {
  // requireSuperAdmin will redirect if user is not super_admin
  // It automatically blocks owners and redirects them to /admin
  // This happens before any data fetching or rendering
  await requireSuperAdmin()

  // Only fetch sensitive data if user is confirmed super_admin
  let businesses: any[] = []
  try {
    businesses = await getAllBusinesses()
  } catch (error) {
    console.error('Error loading businesses:', error)
    // Continue with empty array instead of crashing
    businesses = []
  }

  return (
    <div className="super-admin-page" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">لوحة تحكم المشرف</h1>
        <p className="mt-2 text-zinc-600">
          إدارة جميع الحسابات والاشتراكات
        </p>
      </div>

      <BusinessList businesses={businesses} />
    </div>
  )
}
