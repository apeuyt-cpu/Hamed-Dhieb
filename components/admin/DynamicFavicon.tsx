'use client'

import { useEffect } from 'react'

interface DynamicFaviconProps {
  logoUrl: string | null
  businessName: string
}

export default function DynamicFavicon({ logoUrl, businessName }: DynamicFaviconProps) {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (!logoUrl) return

    // Use requestAnimationFrame to ensure DOM is fully ready
    const rafId = requestAnimationFrame(() => {
      try {
        // Update favicon by modifying existing link or creating new one
        let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
        if (favicon) {
          favicon.href = logoUrl
        } else {
          favicon = document.createElement('link')
          favicon.rel = 'icon'
          favicon.type = 'image/png'
          favicon.href = logoUrl
          document.head?.appendChild(favicon)
        }

        // Update apple-touch-icon
        let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null
        if (appleIcon) {
          appleIcon.href = logoUrl
        } else {
          appleIcon = document.createElement('link')
          appleIcon.rel = 'apple-touch-icon'
          appleIcon.href = logoUrl
          document.head?.appendChild(appleIcon)
        }

        // Update page title
        if (businessName) {
          document.title = businessName
        }
      } catch {
        // Silently ignore any DOM errors
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      // Don't remove elements on cleanup - let them persist
      // This avoids the removeChild null error
    }
  }, [logoUrl, businessName])

  return null
}

