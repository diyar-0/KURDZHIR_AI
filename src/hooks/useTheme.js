import { useCallback, useEffect, useState } from 'react'
import { load, save } from '../lib/storage.js'

const KEY = 'kurdzhir-theme-v1'

/** ڕووکاری ڕۆژ و شەو. ئەگەر هیچ هەڵنەبژێردرابێت، ڕووکاری سیستەمەکە بەکاردێت. */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const v = load(KEY, null)
    return v === 'light' || v === 'dark' ? v : null
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme) root.setAttribute('data-theme', theme)
    else root.removeAttribute('data-theme')
    if (theme) save(KEY, theme)
  }, [theme])

  const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const toggle = useCallback(() => {
    setTheme((t) => {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const dark = t ? t === 'dark' : systemDark
      return dark ? 'light' : 'dark'
    })
  }, [])

  return { isDark, toggle }
}
