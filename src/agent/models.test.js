import test from 'node:test'
import assert from 'node:assert/strict'
import { getModelConfiguration } from './models.js'

test('model configuration includes the Gemini default and allowed models in order', () => {
  const config = getModelConfiguration({
    GEMINI_MODEL: 'gemini-primary',
    GEMINI_ALLOWED_MODELS: 'gemini-extra, gemini-one',
    GROQ_MODEL_2: 'groq-two',
    GROQ_MODEL_1: 'groq-one',
  })

  assert.equal(config.defaultModel, 'gemini-primary')
  assert.deepEqual(config.geminiModels, [
    'gemini-primary',
    'gemini-extra',
    'gemini-one',
  ])
  assert.deepEqual(config.groqModels, ['groq-one', 'groq-two'])
  assert.deepEqual(config.models, [
    'gemini-primary',
    'gemini-extra',
    'gemini-one',
    'groq-one',
    'groq-two',
  ])
  assert.deepEqual(config.providers.map(({ id, defaultModel }) => ({ id, defaultModel })), [
    { id: 'gemini', defaultModel: 'gemini-primary' },
    { id: 'groq', defaultModel: 'groq-one' },
  ])
})

test('model configuration supplies the Gemini default when none is configured', () => {
  const config = getModelConfiguration({})

  assert.equal(config.defaultModel, 'gemini-3.1-flash-lite')
  assert.deepEqual(config.models, ['gemini-3.1-flash-lite'])
})
