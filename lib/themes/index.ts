import { classic } from './classic'
import { minimal } from './minimal'
import { dark } from './dark'

export type Theme = typeof classic

export const themes = {
  classic,
  minimal,
  dark,
} as const

export function getTheme(themeId: string, customPrimaryColor?: string | null): Theme {
  const baseTheme = themes[themeId as keyof typeof themes] || classic
  
  if (customPrimaryColor) {
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: customPrimaryColor,
      },
    }
  }
  
  return baseTheme
}
