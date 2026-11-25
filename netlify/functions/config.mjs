
import { getModelConfiguration } from '../../src/agent/models.js'

export const config = {
  path: '/api/config',
}

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const configuration = getModelConfiguration()

  return new Response(
    JSON.stringify({
      defaultModel: configuration.defaultModel,
      models: configuration.models,
      providers: configuration.providers.map((provider) => ({
        ...provider,
        available: provider.id === 'groq'
          ? Boolean(process.env.GROQ_API_KEY)
          : Boolean(process.env.GEMINI_API_KEY),
      })),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  )
}
