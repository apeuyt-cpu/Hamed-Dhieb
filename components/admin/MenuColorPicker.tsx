'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRESET_COLORS = [
  { name: 'أحمر نبيذي', color: '#8B2635' },
  { name: 'ذهبي', color: '#D4AF37' },
  { name: 'برتقالي', color: '#E85D04' },
  { name: 'أزرق', color: '#2563EB' },
  { name: 'أخضر', color: '#059669' },
  { name: 'بنفسجي', color: '#7C3AED' },
  { name: 'وردي', color: '#DB2777' },
  { name: 'أسود', color: '#18181B' },
]

interface MenuColorPickerProps {
  businessId: string
  currentColor: string | null
  onColorUpdated: () => void
}

export default function MenuColorPicker({ 
  businessId, 
  currentColor, 
  onColorUpdated 
}: MenuColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor || '#8B2635')
  const [customColor, setCustomColor] = useState(currentColor || '#8B2635')
  const [loading, setLoading] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const supabase = createClient()

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color)
    setCustomColor(color)
    await saveColor(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    setSelectedColor(color)
  }

  const handleCustomColorSave = async () => {
    await saveColor(customColor)
  }

  const saveColor = async (color: string) => {
    setLoading(true)
    try {
      const { error } = await (supabase
        .from('businesses') as any)
        .update({ primary_color: color })
        .eq('id', businessId)

      if (error) throw error
      onColorUpdated()
    } catch (err: any) {
      alert(err.message || 'فشل تحديث اللون')
    } finally {
      setLoading(false)
    }
  }

  const resetToDefault = async () => {
    setLoading(true)
    try {
      const { error } = await (supabase
        .from('businesses') as any)
        .update({ primary_color: null })
        .eq('id', businessId)

      if (error) throw error
      setSelectedColor('#8B2635')
      setCustomColor('#8B2635')
      onColorUpdated()
    } catch (err: any) {
      alert(err.message || 'فشل إعادة التعيين')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm lg:text-base font-medium text-zinc-700">
          لون القائمة الرئيسي
        </label>
        {currentColor && (
          <button
            onClick={resetToDefault}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-700 underline disabled:opacity-50"
          >
            إعادة للافتراضي
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.color}
            onClick={() => handleColorSelect(preset.color)}
            disabled={loading}
            className={`w-10 h-10 rounded-xl transition-all disabled:opacity-50 ${
              selectedColor === preset.color 
                ? 'ring-2 ring-offset-2 ring-zinc-900 scale-110' 
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: preset.color }}
            title={preset.name}
          />
        ))}
        
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`w-10 h-10 rounded-xl border-2 border-dashed transition-all flex items-center justify-center ${
            showCustom 
              ? 'border-zinc-900 bg-zinc-100' 
              : 'border-zinc-300 hover:border-zinc-400'
          }`}
          title="لون مخصص"
        >
          <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-12 h-10 rounded-lg cursor-pointer border-0"
          />
          <input
            type="text"
            value={customColor}
            onChange={(e) => {
              if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                setCustomColor(e.target.value)
                if (e.target.value.length === 7) {
                  setSelectedColor(e.target.value)
                }
              }
            }}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm font-mono uppercase"
            placeholder="#000000"
            dir="ltr"
          />
          <button
            onClick={handleCustomColorSave}
            disabled={loading || customColor.length !== 7}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'حفظ'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
        <div 
          className="w-8 h-8 rounded-lg"
          style={{ backgroundColor: selectedColor }}
        />
        <span className="text-sm text-zinc-600">
          معاينة اللون المختار
        </span>
      </div>
    </div>
  )
}
