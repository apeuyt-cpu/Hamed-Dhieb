import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'),
  title: {
    default: 'Scaniha - QR Menu Builder | Digital Restaurant Menus',
    template: '%s | Scaniha',
  },
  description: 'Create beautiful QR code menus for your restaurant, cafe, or food business. Free digital menu builder with QR code generation. Perfect for restaurants, cafes, bars, and food trucks.',
  keywords: [
    'QR menu', 'QR code menu', 'digital menu', 'online menu', 'restaurant menu', 'cafe menu', 'menu builder',
    'QR code generator', 'contactless menu', 'touchless menu', 'digital restaurant menu', 'menu QR code',
    'restaurant QR code', 'cafe QR code', 'food menu QR', 'menu scanner', 'QR menu maker',
    'scaniha', 'scaniha.com', 'menu digital', 'قائمة رقمية', 'QR قائمة', 'منيو QR', 'قائمة المطعم',
    'restaurant technology', 'food service technology', 'restaurant digitalization', 'menu management',
    'free menu builder', 'restaurant menu app', 'menu creator', 'QR menu solution'
  ],
  authors: [{ name: 'Scaniha' }],
  creator: 'Scaniha',
  icons: {
    icon: [
      { url: '/logo-icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-icon.png', type: 'image/png' },
    ],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body id="scaniha-root" suppressHydrationWarning>{children}</body>
    </html>
  )
}

