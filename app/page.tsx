import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scaniha - QR Menu Builder By -Hamed Dhieb-| Free Digital Restaurant Menus ',
  description: 'Create beautiful, customizable digital menus for your restaurant, cafe, or food business. Generate QR codes instantly, manage menu items easily, and share your menu with customers. Free QR menu builder for restaurants, cafes, bars, and food trucks. Perfect for contactless dining.',
  keywords: [
    'QR menu builder', 'QR code menu', 'digital menu', 'online menu', 'restaurant menu builder', 'cafe menu',
    'free QR menu', 'contactless menu', 'touchless menu', 'digital restaurant menu', 'QR code generator',
    'menu QR code', 'restaurant QR code', 'cafe QR code', 'food menu QR', 'menu scanner', 'QR menu maker',
    'scaniha', 'scaniha.com', 'menu digital', 'قائمة رقمية', 'QR قائمة', 'منيو QR', 'قائمة المطعم',
    'restaurant technology', 'food service technology', 'restaurant digitalization', 'menu management',
    'free menu builder', 'restaurant menu app', 'menu creator', 'QR menu solution', 'digital menu system',
    'restaurant menu online', 'cafe menu online', 'food truck menu', 'bar menu QR', 'restaurant ordering',
    'contactless ordering', 'touchless ordering', 'restaurant digital menu', 'menu QR scanner'
  ],
  openGraph: {
    title: 'Scaniha - QR Menu Builder | Free Digital Restaurant Menus',
    description: 'Create beautiful, customizable digital menus for your restaurant, cafe, or food business. Generate QR codes instantly and share your menu with customers.',
    type: 'website',
    url: 'https://scaniha.com',
    siteName: 'Scaniha',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha - QR Menu Builder | Free Digital Restaurant Menus',
    description: 'Create beautiful, customizable digital menus for your restaurant or cafe. Generate QR codes instantly.',
  },
  alternates: {
    canonical: 'https://scaniha.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function Home() {
  const profile = await getCurrentProfile()

  if (profile) {
    // Default to admin dashboard - middleware will redirect super_admins if needed
    redirect('/admin')
  }

  return <LandingPage />
}
