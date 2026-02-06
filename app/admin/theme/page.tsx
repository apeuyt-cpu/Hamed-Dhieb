import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { getAllThemes } from '@/lib/db/themes'
import ThemeSelector from '@/components/theme/ThemeSelector'

export default async function ThemePage() {
  const { user } = await requireOwner()
  const business = await getBusinessByOwner(user.id)
  
  if (!business) {
    return <div>Business not found</div>
  }
  
  const themes = await getAllThemes()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Choose Theme</h1>
        <p className="mt-2 text-gray-600">
          Select a theme for your public menu. Changes apply immediately.
        </p>
      </div>

      <ThemeSelector businessId={business.id} currentThemeId={business.theme_id} themes={themes} />
    </div>
  )
}

