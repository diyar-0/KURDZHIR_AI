/**
 * ===== ئەمە تەنها ئەو فایلەیە کە دەبێت بیگۆڕیت بۆ بەستنەوە بە AI ی ڕاستەقینە =====
 *
 * هەموو بەشەکانی تری ئەپەکە کار دەکەن. ئەم فایلە دوو شت دەدات:
 *   IS_LIVE  : false = وەڵامی نموونەیی (دەمۆ)، true = وەڵامی ڕاستەقینە
 *   askAI()  : فەنکشنێک کە دەقی وەڵام (string) دەگەڕێنێتەوە
 *
 * سێرڤەرەکە (server.js) وەڵام بە «stream» دەنێرێت بە شێوەی SSE:
 *   data: {"text":"..."}     ← پارچەیەکی دەق
 *   data: {"error":"..."}    ← هەڵە
 *   data: [DONE]             ← کۆتایی
 * بۆیە لێرە ناتوانین res.json() بەکاربهێنین؛ دەبێت پارچەکان یەک بە یەک بخوێنینەوە.
 *
 * پێش هەموو شتێک دڵنیابە سێرڤەرەکە کاردەکات:   node server.js
 */

export const IS_LIVE = true


const SERVER_DOWN =
  'ببورە، ئێستا کێشەیەکی تەکنیکی ڕوویداوە و ناتوانین داواکارییەکەت جێبەجێ بکەین. تکایە کەمێک دواتر دووبارە هەوڵ بدەرەوە.'

const SYSTEM_PROMPT =
  `تۆ KURDZHIR AI یاریدەدەرێکی زیرەک و گشتییت. بە زمانی بەکارهێنەر وەڵام بدەرەوە؛ ئەگەر دیاری نەکرا، بە کوردی سۆرانی بنووسە.

جۆری وەڵامەکەت بە داواکارییەکە بگونجێنە و هەمیشە یەک قاڵب بەکارمەهێنە:
- بۆ نووسین، دەقی تەواو و ئامادەی بەکارهێنان بنووسە؛ تەنها ڕێنمایی مەدە.
- بۆ کۆد، کۆدی دروست و گونجاو بە زمانەکە بدە، پاشان بە کورتی ڕوونی بکەرەوە.
- بۆ پلان، هەنگاوە ڕوون و جێبەجێکراوەکان بە ڕیز یان خشتە ڕێکبخە.
- بۆ داوای بیرۆکە، چەند هەڵبژاردەی جیاواز و تایبەت پێشکەش بکە؛ بیرۆکەکان دووبارە و گشتی نەبن.
- بۆ پرسیار، ڕاستەوخۆ وەڵامی پرسیارەکە بدەرەوە؛ مەیکە بە پلان یان لیستی هەنگاو ئەگەر داوا نەکراوە.

وەڵامەکان ڕوون و بە قەدری پێویست ورد بن. هەموو جار بە لیستی ژمارەدار، سێ هەنگاو، یان پرسیاری «دەتەوێت بەردەوام بم؟» کۆتایی مەهێنە. تەنها کاتێک پرسیاری ڕوونکەرەوە بکە کە زانیارییە گرنگەکان بەڕاستی کەم بن. Markdown بەکاربهێنە کاتێک یارمەتیدەرە.`

/**
 * messages: [{ role: 'user' | 'assistant', content: string }, ...]
 * signal  : AbortSignal، بۆ دوگمەی «وەستان»
 * onChunk : (delta: string) => void — هەر پارچەیەکی نوێی دەق لێرە دەگات
 *
 * دەقی تەواو دەگەڕێنێتەوە.
 */
export async function askAI(messages, signal, onChunk, settings = {}) {
  if (!IS_LIVE) {
    await wait(1100, signal)
    return demoReply(messages[messages.length - 1]?.content ?? '')
  }

  // ---- ڕێگای «live» ----
  let res
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM_PROMPT, messages, settings }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(SERVER_DOWN)
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    if (data?.error) throw new Error(data.error)
    // کاتێک سێرڤەرەکە کار نەکات، Vite خۆی هەڵەی 500/502/504 دەگەڕێنێتەوە
    if (res.status >= 500) throw new Error(SERVER_DOWN)
    throw new Error('داواکارییەکە سەرکەوتوو نەبوو (' + res.status + ')')
  }

  // ئەگەر سێرڤەرێکی کۆن وەڵامی تەواو بە JSON بنێرێت، ئەویش کار دەکات
  const kind = res.headers.get('content-type') || ''
  if (!kind.includes('text/event-stream')) {
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    const text = String(data.reply ?? '')
    if (text) onChunk?.(text)
    return text
  }

  return readStream(res.body, onChunk)
}

/** SSE دەخوێنێتەوە و هەر پارچەیەک دەداتە onChunk */
async function readStream(body, onChunk) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

    let idx
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const evt = buf.slice(0, idx)
      buf = buf.slice(idx + 2)

      const line = evt.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return full

      let data
      try {
        data = JSON.parse(payload)
      } catch {
        continue
      }
      if (data.error) throw new Error(data.error)
      if (data.text) {
        full += data.text
        onChunk?.(data.text)
      }
    }
  }

  return full
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

// ---------- وەڵامی نموونەیی (تەنها بۆ دەمۆ) ----------

function short(text, n = 80) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t
}

function demoReply(text) {
  const topic = short(text)
  if (/پایتۆن|python|کۆد|فەنکشن/i.test(text)) {
    return `ئەمە نموونەیەکە بۆ «${topic}»:\n\n\`\`\`python\ndef split_even_odd(numbers):\n    even = [n for n in numbers if n % 2 == 0]\n    odd = [n for n in numbers if n % 2 != 0]\n    return even, odd\n\n\nprint(split_even_odd([1, 2, 3, 4, 5]))\n\`\`\`\n\n**بیرۆکەکە:**\n\n- ناوی فەنکشن و گۆڕاوەکان ڕوون هەڵبژێرە.\n- هەر فەنکشنێک یەک کار بکات.\n\n> ئەمە وەڵامی دەمۆیە و هێشتا بە مۆدێلی AI نەبەستراوەتەوە.`
  }
  return `**باشە، با لەسەر «${topic}» بیر بکەینەوە.**\n\n1. سەرەتا ئامانجی سەرەکی دیاری بکە.\n2. دواتر زانیارییە پێویستەکان کۆبکەرەوە.\n3. لە کۆتاییدا هەنگاوی یەکەم ئەنجام بدە و ئەنجامەکەی ببینە.\n\n> ئەمە وەڵامی دەمۆیە و هێشتا بە مۆدێلی AI نەبەستراوەتەوە.\n\nدەتەوێت بەردەوام بم؟`
}
