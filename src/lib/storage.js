// خەزنکردن هەڵەکەی دەگەڕێنێتەوە تا لایەنی بانگکەر بتوانێت بەکارهێنەر ئاگادار بکاتەوە.

export function load(key, fallback) {
  try {
    const raw = globalThis.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    const serialized = JSON.stringify(value)

    if (typeof serialized !== 'string') {
      throw new TypeError('ناوەڕۆکی خەزنکردن دەبێت JSON ـی دروست بێت.')
    }

    globalThis.localStorage.setItem(key, serialized)
    return null
  } catch (error) {
    return error
  }
}
