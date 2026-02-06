import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { user } = await requireOwner()
    const business = await getBusinessByOwner(user.id)
    
    if (business?.logo_url) {
      return {
        title: `${business.name} - لوحة التحكم`,
        icons: {
          icon: business.logo_url,
          apple: business.logo_url,
        },
      }
    }
    
    return {
      title: 'لوحة التحكم',
      icons: {
        icon: '/logo-icon.png',
        apple: '/logo-icon.png',
      },
    }
  } catch (error: any) {
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    return {
      title: 'لوحة التحكم',
      icons: {
        icon: '/logo-icon.png',
        apple: '/logo-icon.png',
      },
    }
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireOwner will redirect if user is not authenticated or doesn't have owner role
  // It automatically redirects super_admin users to /super-admin
  const { user, profile } = await requireOwner()
  
  // Get business owned by this user only
  let business = await getBusinessByOwner(user.id)
  
  // Verify business belongs to this user if it exists
  if (business && business.owner_id !== user.id) {
    // Security check: business doesn't belong to user
    business = null // Don't show business if ownership doesn't match
  }

  return (
    <AdminLayoutClient business={business}>
      {children}
    </AdminLayoutClient>
  )
}
