
import { runAgent } from '../../src/agent/agentCore.js'
import { getModelConfiguration } from '../../src/agent/models.js'

export const config = {
  path: '/api/chat',
}

const MAX_REQUEST_BYTES = 14_000_000

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const raw = await request.text()

    if (new TextEncoder().encode(raw).length > MAX_REQUEST_BYTES) {
      return jsonResponse(413, { error: 'request too large' })
    }

    let body

    try {
      body = JSON.parse(raw)
    } catch {
      return jsonResponse(400, { error: 'invalid JSON body' })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(400, { error: 'invalid request body' })
    }

    const { system, messages, settings = {} } = body

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return jsonResponse(400, { error: 'invalid messages' })
    }

    if (messages.some((message) => {
      if (!message || !['user', 'assistant'].includes(message.role)) return true

      if (typeof message.content === 'string') {
        return message.content.length > 250_000
      }

      if (
        !message.content ||
        typeof message.content !== 'object' ||
        typeof message.content.text !== 'string' ||
        message.content.text.length > 250_000 ||
        !Array.isArray(message.content.images) ||
        message.content.images.length > 3
      ) return true

      return message.content.images.some((image) =>
        !image ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType) ||
        typeof image.data !== 'string' ||
        image.data.length > 7_000_000 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
      )
    })) {
      return jsonResponse(400, { error: 'invalid messages' })
    }

    if (system !== undefined && typeof system !== 'string') {
      return jsonResponse(400, { error: 'invalid system instruction' })
    }

    if (system && system.length > 30_000) {
      return jsonResponse(400, { error: 'system instruction too large' })
    }

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return jsonResponse(400, { error: 'invalid AI settings' })
    }

    const {
      defaultModel: MODEL,
      geminiModels,
      groqModels,
      models: ALLOWED_MODELS,
    } = getModelConfiguration()

    const model = settings.model || MODEL
    const provider = settings.provider ||
      (groqModels.includes(model) ? 'groq' : 'gemini')
    const style = settings.style || 'balanced'
    const length = settings.length || 'medium'

    const providerModels = provider === 'groq'
      ? groqModels
      : provider === 'gemini'
        ? geminiModels
        : []

    if (!providerModels.includes(model) || !ALLOWED_MODELS.includes(model)) {
      return jsonResponse(400, {
        error: 'مۆدێلی AI ڕێگەپێدراو نییە.',
      })
    }

    const apiKey = provider === 'groq'
      ? process.env.GROQ_API_KEY
      : process.env.GEMINI_API_KEY

    if (!apiKey) {
      return jsonResponse(500, {
        error: provider === 'groq'
          ? 'GROQ_API_KEY لە Netlify دانەنراوە.'
          : 'GEMINI_API_KEY لە Netlify دانەنراوە.',
      })
    }

    if (!['balanced', 'creative', 'formal', 'friendly'].includes(style)) {
      return jsonResponse(400, { error: 'شێوازی وەڵام دروست نییە.' })
    }

    if (!['short', 'medium', 'long'].includes(length)) {
      return jsonResponse(400, { error: 'درێژی وەڵام دروست نییە.' })
    }

    const controller = new AbortController()
    request.signal.addEventListener(
      'abort',
      () => controller.abort(),
      { once: true },
    )

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(streamController) {
        const send = (data) => {
          try {
            streamController.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            )
          } catch {
            // Connection may already be closed.
          }
        }

        try {
          await runAgent({
            system,
            messages,
            apiKey,
            model,
            provider,
            settings: { style, length },
            signal: controller.signal,

            onText(text) {
              send({ text })
            },

            onStatus(status) {
              send({ status })
            },
          })

          send('[DONE]')
          streamController.close()
        } catch (error) {
          if (error?.name !== 'AbortError') {
            console.error('[Agent Error]', error)
            send({ error: error.message || 'Agent failed.' })
          }

          try {
            streamController.close()
          } catch {
            // Stream already closed.
          }
        }
      },

      cancel() {
        controller.abort()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[Chat Function Error]', error)
    return jsonResponse(500, {
      error: error.message || 'Server error',
    })
  }
}
