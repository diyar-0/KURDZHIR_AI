import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupChats, keepPinnedChats, toApiMessages } from './chats.js'

test('pinned chats appear in their own group before date groups', () => {
  const groups = groupChats([
    { id: 'old', title: 'Old', updatedAt: 1, messages: [] },
    { id: 'pinned', title: 'Pinned', updatedAt: 2, pinned: true, messages: [] },
  ])

  assert.equal(groups[0].label, 'پینکراوەکان')
  assert.equal(groups[0].items[0].id, 'pinned')
  assert.ok(
    groups.slice(1).every((group) => !group.items.some((chat) => chat.id === 'pinned')),
  )
})

test('keeping pinned chats excludes every unpinned chat', () => {
  const pinned = { id: 'pinned', pinned: true }
  const chats = [pinned, { id: 'regular' }, { id: 'also-pinned', pinned: true }]

  assert.deepEqual(keepPinnedChats(chats), [pinned, chats[2]])
})

test('API message conversion includes PDF text and image data', () => {
  const [message] = toApiMessages([
    {
      role: 'user',
      text: 'لێکدانەوە',
      files: [
        { name: 'notes.pdf', type: 'application/pdf', text: 'دەقی PDF' },
        { name: 'photo.jpg', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,aGVsbG8=' },
      ],
    },
  ])

  assert.equal(message.role, 'user')
  assert.match(message.content.text, /دەقی PDF/)
  assert.deepEqual(message.content.images, [
    { mimeType: 'image/jpeg', data: 'aGVsbG8=' },
  ])
})

test('API message conversion omits error messages', () => {
  assert.deepEqual(
    toApiMessages([{ role: 'ai', text: 'error', error: true }]),
    [],
  )
})
