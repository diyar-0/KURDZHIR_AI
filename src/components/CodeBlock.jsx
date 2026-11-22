import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { copyText } from '../lib/clipboard.js'

export default function CodeBlock({ lang, text }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const ok = await copyText(text)
    if (!ok) return
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="code" dir="ltr">
      <div className="code-bar">
        <span>{lang || 'code'}</span>
        <button type="button" onClick={copy} aria-label="کۆپی کردنی کۆد">
          <Icon name={copied ? 'check' : 'copy'} size={14} />
          <span dir="rtl">{copied ? 'کۆپی کرا' : 'کۆپی'}</span>
        </button>
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  )
}
