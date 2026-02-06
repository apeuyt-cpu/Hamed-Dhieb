'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface Business {
  id: string
  name: string
  slug: string
}

export default function QRManager({ business }: { business: Business }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateQR()
  }, [business.slug])

  const generateQR = async () => {
    try {
      const menuUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/${business.slug}`
        : `/${business.slug}`
      
      const dataUrl = await QRCode.toDataURL(menuUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('Error generating QR code:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!qrDataUrl) return
    
    const link = document.createElement('a')
    link.download = `${business.slug}-qr-code.png`
    link.href = qrDataUrl
    link.click()
  }

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${business.slug}`
    : `/${business.slug}`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
      </div>
      <div className="p-4 text-center">
        {loading ? (
          <div className="animate-pulse">
            <div className="w-40 h-40 bg-gray-200 rounded mx-auto"></div>
          </div>
        ) : qrDataUrl ? (
          <>
            <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-3 rounded-lg border-2 border-gray-100" />
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
            >
              Download
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500">Failed to generate QR code</p>
        )}
      </div>
    </div>
  )
}

