import { MetadataRoute } from 'next'
import { getActiveBusinesses } from '@/lib/db/business'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
  
  // Get all active businesses (only includes active, non-expired businesses)
  const businesses = await getActiveBusinesses()
  
  // Static pages - includes the main website pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl, // Homepage - highest priority
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
  
  // Dynamic business pages
  const businessPages: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${baseUrl}/${business.slug}`,
    lastModified: business.updated_at ? new Date(business.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  
  return [...staticPages, ...businessPages]
}

