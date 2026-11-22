
import { executeRegisteredTool } from './toolRegistry.js'

const MAX_RESULT_LENGTH = 12000
const MAX_ERROR_LENGTH = 1000

export async function executeToolCall(call, context = {}) {
  const name = call?.name
  const args = call?.args ?? {}

  if (typeof name !== 'string' || !name.trim()) {
    return {
      name: 'unknown',
      response: {
        error: 'Invalid tool name.',
      },
    }
  }

  if (
    args === null ||
    typeof args !== 'object' ||
    Array.isArray(args)
  ) {
    return {
      name,
      response: {
        error: 'Tool arguments must be an object.',
      },
    }
  }

  try {
    const result = await executeRegisteredTool(
      name,
      args,
      context,
    )

    let serialized

    try {
      serialized = JSON.stringify(result ?? null)
    } catch {
      return {
        name,
        response: {
          error: 'Tool result could not be serialized.',
        },
      }
    }

    if (serialized.length > MAX_RESULT_LENGTH) {
      serialized =
        serialized.slice(0, MAX_RESULT_LENGTH) +
        '... [result truncated]'
    }

    return {
      name,
      response: {
        result: serialized,
      },
    }
  } catch (error) {
    const message =
      typeof error?.message === 'string'
        ? error.message
        : 'Tool execution failed.'

    console.error(`[Tool Executor] ${name}:`, message)

    return {
      name,
      response: {
        error: message.slice(0, MAX_ERROR_LENGTH),
      },
    }
  }
}
