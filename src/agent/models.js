function numberedModels(env, prefix) {
  const pattern = new RegExp(`^${prefix}_MODEL_(\\d+)$`)

  return Object.entries(env)
    .map(([name, value]) => ({ match: name.match(pattern), value }))
    .filter(({ match, value }) => match && value?.trim())
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map(({ value }) => value.trim())
}

export function getModelConfiguration(env = process.env) {
  const defaultModel = env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite'
  const geminiModels = [
    defaultModel,
    ...(env.GEMINI_ALLOWED_MODELS || '').split(','),
  ].map((model) => model.trim()).filter(Boolean)
  const groqModels = numberedModels(env, 'GROQ')

  return {
    defaultModel,
    geminiModels: [...new Set(geminiModels)],
    groqModels: [...new Set(groqModels)],
    models: [...new Set([...geminiModels, ...groqModels])],
    providers: [
      {
        id: 'gemini',
        label: 'Gemini',
        models: [...new Set(geminiModels)],
        defaultModel,
      },
      {
        id: 'groq',
        label: 'Groq',
        models: [...new Set(groqModels)],
        defaultModel: groqModels[0],
      },
    ].filter((provider) => provider.models.length > 0),
  }
}
