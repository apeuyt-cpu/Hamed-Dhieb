import { getBusinessBySlug } from '@/lib/db/business'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const business = await getBusinessBySlug(params.slug)
    
    if (!business) {
      return {
        title: 'Menu',
        icons: {
          icon: '/logo-icon.png',
          apple: '/logo-icon.png',
        },
      }
    }

    return {
      title: business.name || 'Menu',
      description: `قائمة ${business.name}`,
      icons: business.logo_url ? {
        icon: business.logo_url,
        apple: business.logo_url,
      } : {
        icon: '/logo-icon.png',
        apple: '/logo-icon.png',
      },
    }
  } catch {
    return {
      title: 'Menu',
    }
  }
}

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

