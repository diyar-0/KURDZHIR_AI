import { useMemo } from 'react'
import { parseBlocks } from '../lib/markdown.js'
import CodeBlock from './CodeBlock.jsx'

function Inline({ parts }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.t === 'b') return <strong key={i}>{p.v}</strong>
        if (p.t === 'code') return <code key={i} className="ic">{p.v}</code>
        return <span key={i}>{p.v}</span>
      })}
    </>
  )
}

export default function Markdown({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'code':
            return <CodeBlock key={i} lang={b.lang} text={b.text} />
          case 'h': {
            const Tag = 'h' + (b.level + 2)
            return (
              <Tag key={i}>
                <Inline parts={b.inline} />
              </Tag>
            )
          }
          case 'quote':
            return (
              <blockquote key={i}>
                <Inline parts={b.inline} />
              </blockquote>
            )
          case 'ul':
          case 'ol': {
            const Tag = b.type
            return (
              <Tag key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline parts={it} />
                  </li>
                ))}
              </Tag>
            )
          }
          default:
            return (
              <p key={i}>
                <Inline parts={b.inline} />
              </p>
            )
        }
      })}
    </div>
  )
}
