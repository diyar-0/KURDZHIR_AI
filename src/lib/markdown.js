// Markdown ی سووک: سەردێڕ، لیست، وتە، بلۆکی کۆد، **تۆخ** و `کۆدی ناو دێڕ`.
// هیچ HTML ێکی ڕاستەوخۆ دروست ناکات، بۆیە ئەمنە.

export function parseInline(s) {
  const out = []
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g
  let last = 0
  let m
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) })
    const tok = m[0]
    if (tok.startsWith('**')) out.push({ t: 'b', v: tok.slice(2, -2) })
    else out.push({ t: 'code', v: tok.slice(1, -1) })
    last = m.index + tok.length
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) })
  return out
}

const FENCE = /^```\s*([\w+#.-]*)\s*$/
const isUl = (l) => /^\s*[-*•]\s+/.test(l)
const isOl = (l) => /^\s*[0-9٠-٩]+[.)]\s+/.test(l)
const isQuote = (l) => /^>\s?/.test(l)
const isHeading = (l) => /^#{1,3}\s+/.test(l)
const startsBlock = (l) => FENCE.test(l) || isHeading(l) || isQuote(l) || isUl(l) || isOl(l)

export function parseBlocks(src) {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    const fence = line.match(FENCE)
    if (fence) {
      const code = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      i++ // دێڕی داخستن
      blocks.push({ type: 'code', lang: fence[1] || '', text: code.join('\n') })
      continue
    }

    if (!line.trim()) {
      i++
      continue
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, inline: parseInline(h[2]) })
      i++
      continue
    }

    if (isQuote(line)) {
      const parts = []
      while (i < lines.length && isQuote(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', inline: parseInline(parts.join('\n')) })
      continue
    }

    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line)
      const items = []
      while (i < lines.length && (ordered ? isOl(lines[i]) : isUl(lines[i]))) {
        const text = lines[i].replace(ordered ? /^\s*[0-9٠-٩]+[.)]\s+/ : /^\s*[-*•]\s+/, '')
        items.push(parseInline(text))
        i++
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items })
      continue
    }

    const para = []
    while (i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i]))) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', inline: parseInline(para.join('\n')) })
  }

  return blocks
}
