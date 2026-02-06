import { notFound } from 'next/navigation'
import { getBusinessBySlug, getBusinessWithCategoriesAndItems, getBusinessDesignForDisplay } from '@/lib/db/business'
import { getTheme } from '@/lib/themes'
import PublicMenu from '@/components/menu/PublicMenu'
import WelcomeWrapper from '@/components/menu/WelcomeWrapper'
import type { Database } from '@/lib/supabase/database.types'
import type { Metadata } from 'next'



type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}



export default async function PublicMenuPage({
  params,
}: {
  params: { slug: string }
}) {
  let business
  try {
    business = await getBusinessBySlug(params.slug)
  } catch (error) {
    console.error('Error fetching business:', error)
    // If DB lookup throws, in development allow a local preview fallback
    if (process.env.NODE_ENV === 'development') {
      console.warn('[dev fallback] getBusinessBySlug failed, using local preview business')
      business = null
    } else {
      notFound()
    }
  }
  
  if (!business) {
    if (process.env.NODE_ENV === 'development') {
      // Provide a minimal mock business so the menu can be previewed locally
      business = {
        id: 'local-preview',
        owner_id: 'local',
        name: `Local Preview - ${params.slug}`,
        slug: params.slug,
        theme_id: 'minimal',
        status: 'active',
        logo_url: null,
        expires_at: null,
        facebook_url: null,
        instagram_url: null,
        twitter_url: null,
        whatsapp_number: null,
        website_url: null,
        primary_color: '#E85D04',
        created_at: new Date().toISOString(),
      } as any
    } else {
      notFound()
    }
  }

  // Check if business is expired or paused
  // If expired, treat it as paused for display purposes
  let isPaused = business.status === 'paused'
  
  if (business.expires_at && business.status === 'active') {
    const now = new Date()
    const expiry = new Date(business.expires_at)
    
    if (expiry < now) {
      // Business has expired - treat as paused for public display
      // But don't update status here (let super admin or cron handle it)
      isPaused = true
    }
  }

  // If paused or expired, still load categories but pass isPaused flag
  // For custom design, skip loading categories as they're not needed
  let categories: Category[] = []
  let design = (business as any).design
  
  // ===============================================
  // CUSTOM DESIGN LOADING FROM DATABASE
  // ===============================================
  // This checks if a design is linked to a QR code and loads it from the design_versions table
  // When users click "عرض القائمة ←" button, they will see this custom design
  // ===============================================
  if (business.id !== 'local-preview') {
    try {
      // getBusinessDesignForDisplay():
      // 1. Checks if qr_design_version_id is set in the business
      // 2. If YES: Fetches the design from design_versions table (database)
      // 3. If NO: Falls back to business.design column
      design = await getBusinessDesignForDisplay(business.id)
    } catch (error) {
      console.error('Error loading design for display:', error)
      // Fall back to business.design if database fetch fails
    }
  }
  
  const hasCustomDesign = design
  if (!isPaused && !hasCustomDesign && business.id !== 'local-preview') {
    try {
      const fetchedCategories = await getBusinessWithCategoriesAndItems(business.id)
      categories = (fetchedCategories as Category[]) || []
    } catch (error) {
      console.error('Error loading categories:', error)
      categories = []
    }
  }

  const theme = getTheme(business.theme_id, business.primary_color)

  // In development, prefer a per-owner local design fallback file if present,
  // otherwise fall back to the global `.local-dev-design.json`.
  if (process.env.NODE_ENV === 'development') {
    try {
      const fs = await import('fs/promises')
      const ownerId = (business as any).owner_id || business.id
      const ownerPath = `.local-dev-design-${ownerId}.json`
      const globalPath = '.local-dev-design.json'

      const ownerExists = await fs.stat(ownerPath).then(() => true).catch(() => false)
      const globalExists = await fs.stat(globalPath).then(() => true).catch(() => false)

      const pathToUse = ownerExists ? ownerPath : (globalExists ? globalPath : null)

      if (pathToUse) {
        const raw = await fs.readFile(pathToUse, 'utf8')
        try {
          const parsed = JSON.parse(raw)
          if (parsed?.design) {
            design = parsed.design
            // If design contains a logo, use it as `logo_url` for the public view
            if (parsed.design.logo) {
              ;(business as any).logo_url = parsed.design.logo
            }
            // If design has an accent color, surface it through primary_color
            if (parsed.design.accentColor) {
              ;(business as any).primary_color = parsed.design.accentColor
            }
          }
        } catch (e) {
          console.warn(`Failed to parse ${pathToUse}`, e)
        }
      }
    } catch (err) {
      // ignore file read errors in production or restricted environments
    }
  }

  // Update business object with the design
  if (design) {
    ;(business as any).design = design
  }

  // Create a business object with modified status for display
  const businessForDisplay = {
    ...business,
    status: isPaused ? 'paused' as const : business.status
  }

  // Generate structured data for SEO
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
  const menuUrl = `${baseUrl}/${business.slug}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: business.name,
    url: menuUrl,
    ...(business.logo_url && { image: business.logo_url }),
    ...(categories.length > 0 && {
      hasMenu: {
        '@type': 'Menu',
        hasMenuSection: categories.map(cat => ({
          '@type': 'MenuSection',
          name: cat.name,
          hasMenuItem: cat.items.map(item => ({
            '@type': 'MenuItem',
            name: item.name,
            description: item.description || undefined,
            offers: item.price ? {
              '@type': 'Offer',
              price: item.price,
              priceCurrency: 'TND',
            } : undefined,
          })),
        })),
      },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <WelcomeWrapper business={businessForDisplay} categories={categories} theme={theme} />
    </>
  )
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const business = await getBusinessBySlug(params.slug)
    if (!business) {
      return {
        title: 'Menu Not Found',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
    const menuUrl = `${baseUrl}/${business.slug}`
    const description = `View the digital menu for ${business.name}. Browse our delicious selection of food and beverages. Order online or scan our QR code menu.`
    
    // Generate relevant keywords based on business name
    const businessKeywords = [
      `${business.name} menu`, `${business.name} قائمة`, `menu ${business.name}`,
      'QR menu', 'digital menu', 'online menu', 'restaurant menu', 'cafe menu',
      'contactless menu', 'touchless menu', 'menu QR code', 'scaniha menu',
      'قائمة رقمية', 'QR قائمة', 'منيو QR', 'قائمة المطعم'
    ]
    
    return {
      title: `${business.name} - Digital Menu | Scaniha`,
      description,
      keywords: businessKeywords,
      alternates: {
        canonical: menuUrl,
      },
      openGraph: {
        title: `${business.name} - Menu`,
        description,
        url: menuUrl,
        siteName: business.name,
        type: 'website',
        ...(business.logo_url && {
          images: [
            {
              url: business.logo_url,
              width: 1200,
              height: 630,
              alt: `${business.name} Logo`,
            },
          ],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${business.name} - Menu`,
        description,
        ...(business.logo_url && {
          images: [business.logo_url],
        }),
      },
      robots: {
        index: business.status === 'active' && (!business.expires_at || new Date(business.expires_at) > new Date()),
        follow: true,
        googleBot: {
          index: business.status === 'active' && (!business.expires_at || new Date(business.expires_at) > new Date()),
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    }
  } catch {
    return {
      title: 'Menu',
      description: 'View our menu',
    }
  }
}
