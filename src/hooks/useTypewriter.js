import { useEffect, useRef, useState } from 'react'

/**
 * دەق پیتبەپیت دەنووسێتەوە. enabled نەبێت، دەقە تەواوەکە یەکسەر پیشان دەدرێت.
 * ئەم hook ـە دەبێت لەو کاتەوە دروست بکرێت کە دەق ئامادەیە (بڕوانە Turn.jsx).
 */
export function useTypewriter(text, enabled, { onTick, onDone } = {}) {
  const [count, setCount] = useState(enabled ? 0 : text.length)
  const tick = useRef(onTick)
  const done = useRef(onDone)
  const finished = useRef(false)
  tick.current = onTick
  done.current = onDone

  useEffect(() => {
    if (!enabled) return undefined
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setCount(text.length)
      return undefined
    }
    const step = Math.max(3, Math.ceil(text.length / 160))
    const id = setInterval(() => setCount((c) => Math.min(text.length, c + step)), 18)
    return () => clearInterval(id)
  }, [enabled, text])

  useEffect(() => {
    if (!enabled) return
    tick.current?.()
    if (count >= text.length && !finished.current) {
      finished.current = true
      done.current?.()
    }
  }, [count, enabled, text])

  const shown = enabled ? text.slice(0, count) : text
  return { shown, typing: enabled && count < text.length }
}
