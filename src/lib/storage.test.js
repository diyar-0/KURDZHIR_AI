import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { load, save } from './storage.js'

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage',
)

function setLocalStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
}

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalStorage)
  } else {
    delete globalThis.localStorage
  }
})

test('save writes JSON and returns null on success', () => {
  const entries = new Map()
  setLocalStorage({
    setItem(key, value) {
      entries.set(key, value)
    },
  })

  assert.equal(save('chats', [{ id: 'chat-1' }]), null)
  assert.equal(entries.get('chats'), '[{"id":"chat-1"}]')
})

test('save returns the browser storage error', () => {
  const quotaError = new DOMException('Storage is full', 'QuotaExceededError')
  setLocalStorage({
    setItem() {
      throw quotaError
    },
  })

  assert.equal(save('chats', []), quotaError)
})

test('save reports values that cannot be serialized as JSON', () => {
  const cyclic = {}
  cyclic.self = cyclic
  setLocalStorage({ setItem() {} })

  assert.ok(save('chats', cyclic) instanceof TypeError)
})

test('save returns an error when browser storage is unavailable', () => {
  delete globalThis.localStorage

  assert.ok(save('chats', []) instanceof TypeError)
})

test('load returns the fallback when stored JSON is invalid', () => {
  setLocalStorage({
    getItem() {
      return '{invalid'
    },
  })
  const fallback = []

  assert.equal(load('chats', fallback), fallback)
})
