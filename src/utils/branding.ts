const DEFAULT_BRAND = '#3b82f6'

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '').trim()
  if (![3, 6].includes(normalized.length)) return null
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const int = parseInt(full, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

const hslToRgb = (h: number, s: number, l: number) => {
  h /= 360
  s /= 100
  l /= 100
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

const toVar = (rgb: { r: number; g: number; b: number }) => `${rgb.r} ${rgb.g} ${rgb.b}`

export const applyBranding = (brandColor?: string | null) => {
  const base = hexToRgb(brandColor || DEFAULT_BRAND) || hexToRgb(DEFAULT_BRAND)!
  const hsl = rgbToHsl(base.r, base.g, base.b)

  const shades = {
    50: clamp(hsl.l + 40),
    100: clamp(hsl.l + 32),
    200: clamp(hsl.l + 24),
    300: clamp(hsl.l + 16),
    400: clamp(hsl.l + 8),
    500: hsl.l,
    600: clamp(hsl.l - 8),
    700: clamp(hsl.l - 16),
    800: clamp(hsl.l - 24),
    900: clamp(hsl.l - 32),
    950: clamp(hsl.l - 40),
  }

  const root = document.documentElement
  Object.entries(shades).forEach(([key, lightness]) => {
    const rgb = hslToRgb(hsl.h, hsl.s, lightness)
    root.style.setProperty(`--primary-${key}`, toVar(rgb))
  })
}
