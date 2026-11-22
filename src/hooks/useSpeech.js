import { useCallback, useEffect, useRef, useState } from 'react'

function getRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * نووسینی دەنگ بە Web Speech API.
 * پشتگیری لە Chrome و Edge باشترە. زمانی کوردی لەسەر هەموو ئامێرەکان نییە.
 */
export function useSpeech(lang, { onText, onError }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const cbText = useRef(onText)
  const cbError = useRef(onError)
  cbText.current = onText
  cbError.current = onError
  const supported = !!getRecognition()

  const start = useCallback(() => {
    const SR = getRecognition()
    if (!SR) {
      cbError.current?.('unsupported')
      return
    }
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
      cbText.current?.(txt)
    }
    rec.onerror = (e) => {
      setListening(false)
      cbError.current?.(e.error)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [lang])

  const stop = useCallback(() => recRef.current?.stop(), [])

  useEffect(() => () => recRef.current?.abort?.(), [])

  return { supported, listening, start, stop }
}
