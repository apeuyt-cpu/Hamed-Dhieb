'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  url: string
  businessName: string
}

export default function QRCodeDisplay({ url, businessName }: QRCodeDisplayProps) {
  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `${businessName}-qr-code.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white p-6 rounded-lg border-4 border-gray-900 inline-block">
          <QRCodeSVG
            id="qr-code-svg"
            value={url}
            size={256}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Menu URL:</strong>
            <br />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-500 break-all"
            >
              {url}
            </a>
          </p>

          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download QR Code
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Tips:</strong>
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
            <li>Print at least 3x3 inches for best scan results</li>
            <li>Place QR codes on tables, menus, or visible surfaces</li>
            <li>Test the QR code before printing multiple copies</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

