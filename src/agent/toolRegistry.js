
const TOOL_TIMEOUT = 20000

export const TOOL_DECLARATIONS = [
  {
    name: 'search_web',
    description:
      'Search the web for current information and relevant websites.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The search query.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current date and time.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'calculate',
    description: 'Calculate a mathematical expression.',
    parameters: {
      type: 'OBJECT',
      properties: {
        expression: {
          type: 'STRING',
          description: 'A mathematical expression.',
        },
      },
      required: ['expression'],
    },
  },
]

export async function searchWeb({ query } = {}) {
  const apiKey = process.env.FREESEA_API_KEY

  if (!apiKey) {
    throw new Error(
      'FREESEA_API_KEY لە فایل .env دانەنراوە.',
    )
  }

  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('تکایە پرسیارێک بنووسە بۆ گەڕان.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    TOOL_TIMEOUT,
  )

  try {
    const response = await fetch(
      'https://freesea.dev/v1/search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
        signal: controller.signal,
      },
    )

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('[Freesea Search Error]', {
        status: response.status,
        message:
          data?.error?.message ||
          data?.error ||
          data?.message ||
          'Unknown API error',
      })

      if (response.status === 401) {
        throw new Error('کلیلی Freesea API هەڵەیە یان بەسەرچووە.')
      }

      if (response.status === 403) {
        throw new Error('دەستگەیشتن بە Freesea API ڕەتکرایەوە.')
      }

      if (response.status === 429) {
        throw new Error(
          'سنووری گەڕان گەیشتووەتە کۆتایی؛ دواتر دووبارە تاقی بکەرەوە.',
        )
      }

      if (response.status === 503) {
        throw new Error('خزمەتگوزاری Freesea ئێستا بەردەست نییە.')
      }

      throw new Error(`Freesea API error: ${response.status}`)
    }

    const results = Array.isArray(data?.results)
      ? data.results.slice(0, 8).map((item) => ({
          type: item.type || 'organic',
          title: item.title || 'بێ ناونیشان',
          url: item.url || '',
          domain: item.domain || '',
          snippet: item.content || item.description || '',
          ...(item.disclosure
            ? { disclosure: item.disclosure }
            : {}),
          ...(item.incentive
            ? { incentive: item.incentive }
            : {}),
        }))
      : []

    return {
      query: data?.query || query.trim(),
      total: results.length,
      results,
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('کاتی چاوەڕوانی گەڕانی وێب تەواو بوو.')
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function calculateExpression(expression) {
  if (
    typeof expression !== 'string' ||
    !expression.trim()
  ) {
    throw new Error('تکایە دەربڕینێکی بیرکاری بنووسە.')
  }

  if (expression.length > 200) {
    throw new Error('دەربڕینی بیرکاری زۆر درێژە.')
  }

  if (!/^[\d\s()+\-*/%.]+$/.test(expression)) {
    throw new Error('دەربڕینی بیرکاری نادروستە.')
  }

  // تەنها کردارە بیرکارییە سنووردارەکان ڕێگەپێدراون.
  const result = Function(
    `"use strict"; return (${expression})`,
  )()

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('ئەنجامی بیرکاری دروست نییە.')
  }

  return {
    expression,
    result,
  }
}

export async function executeRegisteredTool(
  name,
  args = {},
  context = {},
) {
  switch (name) {
    case 'search_web':
      return searchWeb(args)

    case 'get_current_time': {
      const now = new Date()

      return {
        iso: now.toISOString(),
        utc: now.toUTCString(),
      }
    }

    case 'calculate':
      return calculateExpression(args?.expression)

    default:
      throw new Error(`ئامرازی "${name}" نەدۆزرایەوە.`)
  }
}
