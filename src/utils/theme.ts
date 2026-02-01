export type Theme = 'light' | 'dark'

const THEME_KEY = 'theme'

export const getStoredTheme = (): Theme | null => {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

export const getSystemTheme = (): Theme => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const applyTheme = (theme: Theme) => {
  const isDark = theme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.dataset.theme = theme
  document.body.classList.toggle('dark', isDark)
  document.body.dataset.theme = theme
}

export const initTheme = () => {
  const stored = getStoredTheme()
  applyTheme(stored ?? getSystemTheme())

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = (event: MediaQueryListEvent) => {
    if (getStoredTheme()) return
    applyTheme(event.matches ? 'dark' : 'light')
  }

  if (media.addEventListener) {
    media.addEventListener('change', onChange)
  } else {
    // Safari fallback
    // @ts-ignore
    media.addListener(onChange)
  }
}

export const setTheme = (theme: Theme) => {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }))
}

export const getActiveTheme = (): Theme => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
