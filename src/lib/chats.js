// یارمەتیدەرەکانی گفتوگۆ: ناسنامە، ناونیشان، گرووپکردنی بەپێی بەروار، گەڕان و ناردن بۆ API.

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function titleFrom(text) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return 'گفتوگۆی نوێ'
  return t.length > 38 ? t.slice(0, 38).trimEnd() + '…' : t
}

export function keepPinnedChats(chats) {
  return chats.filter((chat) => chat.pinned)
}

const DAY = 86400000

export function groupChats(chats) {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt)
  const pinned = sorted.filter((chat) => chat.pinned)
  const groups = [
    { label: 'پینکراوەکان', items: pinned },
    { label: 'ئەمڕۆ', items: [] },
    { label: 'دوێنێ', items: [] },
    { label: '٧ ڕۆژی ڕابردوو', items: [] },
    { label: 'کۆنتر', items: [] },
  ]
  for (const c of sorted.filter((chat) => !chat.pinned)) {
    const t = c.updatedAt
    const g = t >= startToday ? 0 : t >= startToday - DAY ? 1 : t >= startToday - 7 * DAY ? 2 : 3
    groups[g].items.push(c)
  }
  return groups.filter((g) => g.items.length > 0)
}

export function chatMatches(chat, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (chat.title.toLowerCase().includes(q)) return true
  return chat.messages.some((m) => (m.text || '').toLowerCase().includes(q))
}

function userContent(message) {
  const files = (message.files || [])
    .filter((file) => file.text)
    .map((file) => `[فایل: ${file.name}]\n${file.text}`)
    .join('\n\n')
  const text = files ? `${files}\n\n${message.text}` : message.text
  const images = (message.files || [])
    .filter((file) => file.dataUrl && file.type?.startsWith('image/'))
    .map((file) => ({
      mimeType: file.type,
      data: file.dataUrl.slice(file.dataUrl.indexOf(',') + 1),
    }))

  return images.length ? { text, images } : text
}

/**
 * پەیامەکانی گفتوگۆ بۆ ئەو شێوەیەی API دەیەوێت:
 * [{ role: 'user' | 'assistant', content: string }]
 * پەیامی هەڵە (error) نانێردرێت.
 */
export function toApiMessages(messages) {
  return messages
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.role === 'ai' ? m.text : userContent(m) }))
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'شەوت باش'
  if (h < 12) return 'بەیانیت باش'
  if (h < 17) return 'ڕۆژت باش'
  if (h < 21) return 'ئێوارەت باش'
  return 'شەوت باش'
}
