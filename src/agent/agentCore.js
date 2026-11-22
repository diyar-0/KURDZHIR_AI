
import { TOOL_DECLARATIONS } from './toolRegistry.js'
import { executeToolCall } from './toolExecutor.js'

const API_BASE = (
  process.env.GEMINI_BASE_URL ||
  'https://generativelanguage.googleapis.com'
).replace(/\/+$/, '')
const GROQ_API_BASE = 'https://api.groq.com/openai/v1'

const MAX_TOOL_ROUNDS = 5

function extractText(data) {
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function geminiRequest({
  model,
  apiKey,
  body,
  signal,
  streaming = false,
}) {
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY لە فایلە .env ـەکەدا نییە.',
    )
  }

  if (!model) {
    throw new Error('GEMINI_MODEL دیاری نەکراوە.')
  }

  const endpoint = streaming
    ? `${API_BASE}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
    : `${API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`

  console.log('[Gemini API Endpoint]', endpoint)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message =
      data?.error?.message ||
      `Gemini request failed (${response.status})`

    console.error('[Gemini API Error]', {
      status: response.status,
      message,
    })

    throw new Error(message)
  }

  return response
}

function toOpenAIParameters(value) {
  if (Array.isArray(value)) return value.map(toOpenAIParameters)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === 'type' && typeof item === 'string'
        ? item.toLowerCase()
        : toOpenAIParameters(item),
    ]),
  )
}

function toOpenAIMessages(systemInstruction, contents) {
  return [
    { role: 'system', content: systemInstruction.parts.map((part) => part.text).join('\n\n') },
    ...contents.map((message) => {
      const text = message.parts
        .filter((part) => typeof part.text === 'string')
        .map((part) => part.text)
      const images = message.parts
        .filter((part) => part.inlineData?.data)
        .map((part) => ({
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          },
        }))

      const content = images.length
        ? [
            ...text.map((part) => ({ type: 'text', text: part })),
            ...images,
          ]
        : text.join('\n')

      return {
        role: message.role === 'model' ? 'assistant' : 'user',
        content,
      }
    }),
  ]
}

async function groqRequest({ apiKey, body, signal, streaming = false }) {
  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, stream: streaming }),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = data?.error?.message || `Groq request failed (${response.status})`
    console.error('[Groq API Error]', { status: response.status, message })
    throw new Error(message)
  }

  return response
}

async function readGroqStream(response, onText) {
  if (!response.body) throw new Error('Groq هیچ stream ـێکی نەگەڕاندەوە.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  function handleEvent(event) {
    for (const line of event.split('\n')) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue

      let data
      try {
        data = JSON.parse(payload)
      } catch {
        continue
      }
      if (data.error) throw new Error(data.error.message || 'Groq stream error.')

      const text = data.choices?.[0]?.delta?.content
      if (typeof text === 'string' && text) {
        fullText += text
        onText?.(text)
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let index
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        handleEvent(buffer.slice(0, index))
        buffer = buffer.slice(index + 2)
      }
    }
    buffer += decoder.decode()
    if (buffer.trim()) handleEvent(buffer)
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }

  return fullText
}

async function runGroqAgent({
  systemInstruction,
  contents,
  apiKey,
  model,
  settings,
  signal,
  onText,
  onStatus,
}) {
  const messages = toOpenAIMessages(systemInstruction, contents)
  const tools = TOOL_DECLARATIONS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toOpenAIParameters(tool.parameters),
    },
  }))
  const maxTokens = settings.length === 'short'
    ? 1024
    : settings.length === 'long'
      ? 4096
      : 2048
  let completedToolRounds = 0

  while (completedToolRounds < MAX_TOOL_ROUNDS) {
    onStatus?.({
      type: 'thinking',
      message: 'Agent داواکارییەکە شیدەکاتەوە...',
    })

    const response = await groqRequest({
      apiKey,
      signal,
      body: {
        model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: settings.style === 'creative' ? 0.8 : 0.5,
        max_tokens: maxTokens,
      },
    })
    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message
    if (!assistantMessage) throw new Error('Groq هیچ وەڵامێکی دروست نەگەڕاندەوە.')

    const calls = assistantMessage.tool_calls || []
    if (calls.length === 0) {
      const text = typeof assistantMessage.content === 'string'
        ? assistantMessage.content
        : ''
      if (!text) throw new Error('Groq هیچ دەقێکی وەڵامی نەگەڕاندەوە.')
      onText?.(text)
      return text
    }

    messages.push(assistantMessage)
    onStatus?.({
      type: 'tools',
      tools: calls.map((call) => call.function?.name || 'unknown'),
      message: 'Agent ئامرازەکان جێبەجێ دەکات...',
    })

    for (const call of calls) {
      const name = call.function?.name
      let args
      try {
        args = JSON.parse(call.function?.arguments || '{}')
      } catch {
        args = null
      }

      console.log(`\n[Agent Tool Call] ${name || 'unknown'}`)
      onStatus?.({
        type: 'tool_start',
        tool: name,
        message: `ئامرازی ${name || 'unknown'} جێبەجێ دەکرێت...`,
      })

      const result = await executeToolCall({ name, args }, { apiKey, model, signal })
      const failed = Boolean(result.response?.error)
      onStatus?.({
        type: failed ? 'tool_error' : 'tool_success',
        tool: name,
        message: failed
          ? `ئامرازی ${name || 'unknown'} سەرکەوتوو نەبوو.`
          : `ئامرازی ${name || 'unknown'} تەواو بوو.`,
      })
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result.response ?? {
          error: 'ئامرازەکە هیچ ئەنجامێکی نەگەڕاندەوە.',
        }),
      })
    }

    completedToolRounds++
  }

  onStatus?.({
    type: 'final',
    message: 'Agent وەڵامی کۆتایی ئامادە دەکات...',
  })
  const finalResponse = await groqRequest({
    apiKey,
    signal,
    streaming: true,
    body: {
      model,
      messages,
      temperature: settings.style === 'creative' ? 0.8 : 0.5,
      max_tokens: maxTokens,
    },
  })

  return readGroqStream(finalResponse, onText)
}

async function readFinalStream(response, onText, onSources) {
  if (!response.body) {
    throw new Error('Gemini هیچ stream ـێکی نەگەڕاندەوە.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let fullText = ''
  const sources = new Map()

  function handleEvent(event) {
    const lines = event.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data:')) continue

      const payload = line.slice(5).trim()

      if (!payload || payload === '[DONE]') continue

      let data

      try {
        data = JSON.parse(payload)
      } catch {
        continue
      }

      if (data.error) {
        throw new Error(
          data.error.message || 'Gemini stream error.',
        )
      }

      if (data.promptFeedback?.blockReason) {
        throw new Error(
          `Request blocked: ${data.promptFeedback.blockReason}`,
        )
      }

      const candidate = data.candidates?.[0]

      for (
        const chunk of
        candidate?.groundingMetadata?.groundingChunks ?? []
      ) {
        const web = chunk.web

        if (
          web?.uri &&
          /^https?:\/\//i.test(web.uri)
        ) {
          sources.set(
            web.uri,
            String(web.title || web.uri),
          )
        }
      }

      const text = extractText(data)

      if (text) {
        fullText += text
        onText?.(text)
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      let index

      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        handleEvent(event)
      }
    }

    buffer += decoder.decode()

    if (buffer.trim()) {
      handleEvent(buffer)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }

  if (sources.size > 0) {
    const sourceEntries = [...sources.entries()]

    const sourceList = sourceEntries
      .map(([url, title]) => {
        const safeTitle = title.replace(/[\[\]*\n\r]/g, ' ')
        return `- [${safeTitle}](${url})`
      })
      .join('\n')

    onSources?.(
      sourceEntries.map(([url, title]) => ({ url, title })),
    )

    const sourceText = `\n\n**سەرچاوەکان:**\n${sourceList}`

    fullText += sourceText
    onText?.(sourceText)
  }

  return fullText
}

export async function runAgent({
  system,
  messages,
  apiKey,
  model,
  provider = 'gemini',
  settings = {},
  signal,
  onText,
  onStatus,
}) {
  const contents = (messages ?? [])
    .filter(
      (message) =>
        message &&
        ['user', 'assistant', 'model'].includes(message.role),
    )
    .map((message) => ({
      role:
        message.role === 'assistant' || message.role === 'model'
          ? 'model'
          : 'user',
      parts: typeof message.content === 'string'
        ? [{ text: message.content }]
        : [
            ...(message.content?.text
              ? [{ text: String(message.content.text) }]
              : []),
            ...(message.content?.images ?? []).map((image) => ({
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            })),
          ],
    }))
    .filter((message) =>
      message.parts.some(
        (part) => part.text?.trim() || part.inlineData?.data,
      ),
    )

  if (contents.length === 0) {
    throw new Error('هیچ پەیامێک بۆ Agent نەنێردراوە.')
  }

  const systemInstruction = {
    parts: [
      {
        text: [
          String(system || ''),
          settings.style === 'creative'
            ? 'شێوازی وەڵام: داهێنەرانە و چەند هەڵبژاردەی نوێ پێشکەش بکە.'
            : settings.style === 'formal'
              ? 'شێوازی وەڵام: فەرمی، ورد و پڕۆفیشناڵ.'
              : settings.style === 'friendly'
                ? 'شێوازی وەڵام: دۆستانە، سروشتی و ئاسان‌تێگەیشتن.'
                : '',
          settings.length === 'short'
            ? 'وەڵامەکە کورت و ڕاستەوخۆ بێت.'
            : settings.length === 'long'
              ? 'بە وردی پێویست ڕوون بکەرەوە و نموونە بدە، بەبێ دووبارەکردنەوە.'
              : '',
          `
تۆ KURDZHIR AI ـیت و مێشکی ناوەندیی سیستەمەکەیت.

بە پێی داواکاریی بەکارهێنەر بڕیار بدە کە کام ئامراز پێویستە.
ئەگەر ئامرازێک پێویستە، function calling بەکاربهێنە.
ئەگەر چەند ئامرازێک پێویستن، دەتوانیت بە چەند خولێک بیانبانگ بکەیت.

ئەنجامی ڕاستەقینەی ئامرازەکان بەکاربهێنە.
هیچ ئەنجامێکی ساختە مەنووسە.
ئەگەر ئامرازێک شکستی هێنا، بەکارهێنەر ئاگادار بکەرەوە.
بە کوردی سۆرانی وەڵام بدەرەوە، مەگەر بەکارهێنەر زمانێکی تر بخوازێت.
`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
  }

  if (provider === 'groq') {
    return runGroqAgent({
      systemInstruction,
      contents,
      apiKey,
      model,
      settings,
      signal,
      onText,
      onStatus,
    })
  }

  let completedToolRounds = 0

  while (completedToolRounds < MAX_TOOL_ROUNDS) {
    onStatus?.({
      type: 'thinking',
      message: 'Agent داواکارییەکە شیدەکاتەوە...',
    })

    const response = await geminiRequest({
      model,
      apiKey,
      signal,
      body: {
        systemInstruction,
        contents,
        generationConfig: {
          temperature: settings.style === 'creative' ? 0.8 : 0.5,
          maxOutputTokens:
            settings.length === 'short'
              ? 1024
              : settings.length === 'long'
                ? 4096
                : 2048,
        },
        tools: [
          {
            functionDeclarations: TOOL_DECLARATIONS,
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: 'AUTO',
          },
        },
      },
    })

    const data = await response.json()
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts ?? []

    if (data.promptFeedback?.blockReason) {
      throw new Error(
        `Request blocked: ${data.promptFeedback.blockReason}`,
      )
    }

    if (!candidate) {
      throw new Error(
        'Gemini هیچ وەڵامێکی دروست نەگەڕاندەوە.',
      )
    }

    const calls = parts
      .filter((part) => part.functionCall?.name)
      .map((part) => part.functionCall)

    if (calls.length === 0) {
      const text = extractText(data)
      if (!text) throw new Error('Gemini هیچ دەقێکی وەڵامی نەگەڕاندەوە.')
      onText?.(text)
      return text
    }

    contents.push({
      role: 'model',
      parts,
    })

    onStatus?.({
      type: 'tools',
      tools: calls.map((call) => call.name),
      message: 'Agent ئامرازەکان جێبەجێ دەکات...',
    })

    const responses = []

    for (const call of calls) {
      console.log(`\n[Agent Tool Call] ${call.name}`)

      onStatus?.({
        type: 'tool_start',
        tool: call.name,
        message: `ئامرازی ${call.name} جێبەجێ دەکرێت...`,
      })

      try {
        const result = await executeToolCall(call, {
          apiKey,
          model,
          signal,
        })

        console.log(`[Agent Tool Result] ${call.name} completed`)

        onStatus?.({
          type: 'tool_success',
          tool: call.name,
          message: `ئامرازی ${call.name} تەواو بوو.`,
        })

        responses.push({
          functionResponse: {
            name: result.name || call.name,
            response: result.response ?? {
              error: 'ئامرازەکە هیچ ئەنجامێکی نەگەڕاندەوە.',
            },
          },
        })
      } catch (error) {
        const message = getErrorMessage(error)

        console.error(
          `[Agent Tool Error] ${call.name}:`,
          message,
        )

        onStatus?.({
          type: 'tool_error',
          tool: call.name,
          message: `ئامرازی ${call.name} سەرکەوتوو نەبوو.`,
        })

        responses.push({
          functionResponse: {
            name: call.name,
            response: {
              error: message,
            },
          },
        })
      }
    }

    contents.push({
      role: 'user',
      parts: responses,
    })

    completedToolRounds++
  }

  onStatus?.({
    type: 'final',
    message: 'Agent وەڵامی کۆتایی ئامادە دەکات...',
  })

  const finalResponse = await geminiRequest({
    model,
    apiKey,
    signal,
    streaming: true,
    body: {
      systemInstruction,
      contents,
      generationConfig: {
        temperature: settings.style === 'creative' ? 0.8 : 0.5,
        maxOutputTokens:
          settings.length === 'short'
            ? 1024
            : settings.length === 'long'
              ? 4096
              : 2048,
      },
    },
  })

  return readFinalStream(finalResponse, onText)
}
