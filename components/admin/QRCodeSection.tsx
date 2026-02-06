'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface Business {
  id: string
  name: string
  slug: string
}

export default function QRCodeSection({ business }: { business: Business }) {
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
        width: 400,
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
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code</h2>
        <p className="text-gray-600">Download your QR code for customers to scan</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
          {loading ? (
            <div className="animate-pulse">
              <div className="w-64 h-64 bg-gray-200 rounded mx-auto"></div>
            </div>
          ) : qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4 break-all">{menuUrl}</p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Download QR Code
              </button>
            </>
          ) : (
            <p className="text-gray-500">Failed to generate QR code</p>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Print this QR code and place it on tables or menus. Customers can scan it to view your digital menu.
          </p>
        </div>
      </div>
    </div>
  )
}

