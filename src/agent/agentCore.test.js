import test from 'node:test'
import assert from 'node:assert/strict'
import { runAgent } from './agentCore.js'

test('Gemini returns the initial answer without making a redundant second request', async (t) => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) })
    return Response.json({
      candidates: [{
        content: {
          parts: [{ text: 'Gemini answer' }],
        },
      }],
    })
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const chunks = []
  const result = await runAgent({
    apiKey: 'test-key',
    model: 'gemini-test',
    messages: [{ role: 'user', content: 'Hello' }],
    onText: (chunk) => chunks.push(chunk),
  })

  assert.equal(result, 'Gemini answer')
  assert.deepEqual(chunks, ['Gemini answer'])
  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /:generateContent$/)
})

test('Groq returns the initial answer without making a redundant second request', async (t) => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) })
    return Response.json({
      choices: [{
        message: {
          role: 'assistant',
          content: 'Groq answer',
          tool_calls: [],
        },
      }],
    })
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const chunks = []
  const result = await runAgent({
    provider: 'groq',
    apiKey: 'test-key',
    model: 'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: 'Hello' }],
    onText: (chunk) => chunks.push(chunk),
  })

  assert.equal(result, 'Groq answer')
  assert.deepEqual(chunks, ['Groq answer'])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].body.stream, false)
})

test('Groq agent executes tools and returns the grounded answer without an extra request', async (t) => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) })

    if (requests.length === 1) {
      return Response.json({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call-time',
              type: 'function',
              function: {
                name: 'get_current_time',
                arguments: '{}',
              },
            }],
          },
        }],
      })
    }

    if (requests.length === 2) {
      return Response.json({
        choices: [{
          message: {
            role: 'assistant',
            content: 'I have the current time.',
            tool_calls: [],
          },
        }],
      })
    }

    throw new Error('Unexpected redundant Groq request')
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const chunks = []
  const result = await runAgent({
    provider: 'groq',
    apiKey: 'test-key',
    model: 'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: 'What time is it?' }],
    onText: (chunk) => chunks.push(chunk),
  })

  assert.equal(result, 'I have the current time.')
  assert.deepEqual(chunks, ['I have the current time.'])
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://api.groq.com/openai/v1/chat/completions')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-key')
  assert.equal(requests[0].body.tools[0].function.parameters.type, 'object')
  assert.equal(requests[1].body.messages.at(-1).role, 'tool')
  assert.equal(requests[1].body.messages.at(-1).tool_call_id, 'call-time')
  assert.equal(requests[1].body.stream, false)
})
