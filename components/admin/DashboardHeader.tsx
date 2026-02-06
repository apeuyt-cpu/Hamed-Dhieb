'use client'

interface Business {
  id: string
  name: string
  slug: string
  status: 'active' | 'paused'
  logo_url: string | null
}

export default function DashboardHeader({ business }: { business: Business }) {
  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${business.slug}`
    : `/${business.slug}`

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {business.logo_url && (
            <img 
              src={business.logo_url} 
              alt={business.name}
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain bg-white rounded-xl p-2"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{business.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>👁️</span>
                <span className="font-mono text-xs">{business.slug}</span>
              </a>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                business.status === 'active'
                  ? 'bg-green-500/30 text-green-100'
                  : 'bg-yellow-500/30 text-yellow-100'
              }`}>
                {business.status === 'active' ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

