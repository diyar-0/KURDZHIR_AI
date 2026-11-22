
import http from 'node:http'
import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runAgent } from './src/agent/agentCore.js'
import { getModelConfiguration } from './src/agent/models.js'

// ═══════════════════════════════════════════════════════════
// Environment variables
// ═══════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '.env')

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8')

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const match = trimmed.match(
      /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/,
    )

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]
        .replace(/^(['"])(.*)\1$/, '$2')
        .trim()
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const KEY = process.env.GEMINI_API_KEY
const {
  defaultModel: MODEL,
  geminiModels,
  groqModels,
  models: ALLOWED_MODELS,
  providers: MODEL_PROVIDERS,
} = getModelConfiguration()
const PORT = Number(process.env.PORT) || 8787

const FREESEA_KEY = process.env.FREESEA_API_KEY
const CHAT_RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT) || 15
const CHAT_RATE_WINDOW_MS = Number(process.env.CHAT_RATE_WINDOW_MS) || 60_000
const MAX_REQUEST_BYTES = 14_000_000
const requestWindows = new Map()

if (!KEY && !process.env.GROQ_API_KEY) {
  console.error('❌ GEMINI_API_KEY یان GROQ_API_KEY لە فایلی .env نەدۆزرایەوە.')
  process.exit(1)
}

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('❌ ژمارەی PORT دروست نییە.')
  process.exit(1)
}

console.log(
  `[Configuration] Freesea API: ${FREESEA_KEY ? 'OK' : 'MISSING'}`,
)

// ═══════════════════════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  const sendJson = (status, data) => {
    if (res.headersSent || res.writableEnded) return

    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })

    res.end(JSON.stringify(data))
  }

  if (req.method === 'GET' && req.url === '/api/config') {
    return sendJson(200, {
      defaultModel: MODEL,
      models: ALLOWED_MODELS,
      providers: MODEL_PROVIDERS.map((provider) => ({
        ...provider,
        available: Boolean(
          provider.id === 'groq' ? process.env.GROQ_API_KEY : KEY,
        ),
      })),
    })
  }

  if (req.method !== 'POST' || req.url !== '/api/chat') {
    return sendJson(404, { error: 'not found' })
  }

  const now = Date.now()
  const address = req.socket.remoteAddress || 'unknown'
  const window = requestWindows.get(address)
  if (!window || now - window.startedAt >= CHAT_RATE_WINDOW_MS) {
    requestWindows.set(address, { startedAt: now, count: 1 })
  } else if (window.count >= CHAT_RATE_LIMIT) {
    res.setHeader(
      'Retry-After',
      String(Math.ceil((CHAT_RATE_WINDOW_MS - (now - window.startedAt)) / 1000)),
    )
    return sendJson(429, { error: 'داواکاریی زۆر نێردراوە. کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەرەوە.' })
  } else {
    window.count++
  }

  if (requestWindows.size > 1000) {
    for (const [ip, entry] of requestWindows) {
      if (now - entry.startedAt >= CHAT_RATE_WINDOW_MS) requestWindows.delete(ip)
    }
  }

  const controller = new AbortController()
  let disconnected = false

  res.on('close', () => {
    if (!res.writableEnded) {
      disconnected = true
      controller.abort()
    }
  })

  try {
    // Read request body with a size limit
    let raw = ''

    for await (const chunk of req) {
      raw += chunk.toString('utf8')

      if (Buffer.byteLength(raw, 'utf8') > MAX_REQUEST_BYTES) {
        return sendJson(413, {
          error: 'request too large',
        })
      }
    }

    // Parse JSON safely
    let body

    try {
      body = JSON.parse(raw)
    } catch {
      return sendJson(400, {
        error: 'invalid JSON body',
      })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJson(400, {
        error: 'invalid request body',
      })
    }

    const { system, messages, settings = {} } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return sendJson(400, {
        error: 'messages required',
      })
    }

    if (
      messages.length > 100 ||
      messages.some(
        (message) => {
          if (!message || !['user', 'assistant'].includes(message.role)) return true
          if (typeof message.content === 'string') return message.content.length > 250_000
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
            !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data),
          )
        },
      )
    ) {
      return sendJson(400, {
        error: 'invalid messages',
      })
    }

    if (system !== undefined && typeof system !== 'string') {
      return sendJson(400, {
        error: 'invalid system instruction',
      })
    }

    if (system && system.length > 30_000) {
      return sendJson(400, { error: 'system instruction too large' })
    }

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return sendJson(400, { error: 'invalid AI settings' })
    }

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
      return sendJson(400, { error: 'مۆدێلی AI ڕێگەپێدراو نییە.' })
    }
    const modelApiKey = provider === 'groq'
      ? process.env.GROQ_API_KEY
      : KEY
    if (!modelApiKey) {
      return sendJson(500, {
        error: provider === 'groq'
          ? 'GROQ_API_KEY لە فایلە .env ـەکەدا نییە.'
          : 'GEMINI_API_KEY لە فایلە .env ـەکەدا نییە.',
      })
    }
    if (!['balanced', 'creative', 'formal', 'friendly'].includes(style)) {
      return sendJson(400, { error: 'شێوازی وەڵام دروست نییە.' })
    }
    if (!['short', 'medium', 'long'].includes(length)) {
      return sendJson(400, { error: 'درێژی وەڵام دروست نییە.' })
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Send JSON SSE events
    const write = (data) => {
      if (disconnected || res.writableEnded) return

      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch (error) {
        console.error('[SSE Write Error]', error.message)
      }
    }

    // Run central AI agent
    await runAgent({
      system,
      messages,
      apiKey: modelApiKey,
      model,
      provider,
      settings: { style, length },
      signal: controller.signal,

      onText(text) {
        write({ text })
      },

      onStatus(status) {
        console.log(
          '[Agent]',
          status?.type || 'unknown',
          status?.message || '',
        )

        // Status events are available to the frontend.
        write({ status })
      },
    })

    // Finish the stream
    if (!disconnected && !res.writableEnded) {
      // Send the completion marker as raw SSE data.
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (error) {
    if (error?.name === 'AbortError' || disconnected) {
      return
    }

    console.error('[Agent Error]', error)

    const message =
      error instanceof Error ? error.message : 'Agent failed.'

    if (!res.headersSent) {
      return sendJson(500, {
        error: message,
      })
    }

    if (!res.writableEnded) {
      try {
        writeErrorEvent(res, message)
      } catch {
        // The connection may already be closed.
      }

      res.end()
    }
  }
})

// ═══════════════════════════════════════════════════════════
// SSE error helper
// ═══════════════════════════════════════════════════════════

function writeErrorEvent(res, message) {
  res.write(
    `data: ${JSON.stringify({ error: message })}\n\n`,
  )
}

// ═══════════════════════════════════════════════════════════
// Server error handling
// ═══════════════════════════════════════════════════════════

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ پۆرت ${PORT} پێشتر بەکاردێت.`)
    console.error(`netstat -ano | findstr :${PORT}`)
    return
  }

  console.error('[Server Error]', error)
})

// ═══════════════════════════════════════════════════════════
// Start server
// ═══════════════════════════════════════════════════════════

server.listen(PORT, '127.0.0.1', () => {
  console.log('')
  console.log('════════════════════════════════════════')
  console.log('🚀 KURDZHIR AI Central Agent')
  console.log(`🌐 http://127.0.0.1:${PORT}`)
  console.log(`🤖 Gemini model: ${MODEL}`)
  console.log(`🔎 Freesea API: ${FREESEA_KEY ? 'OK' : 'MISSING'}`)
  console.log('════════════════════════════════════════')
  console.log('')
})
