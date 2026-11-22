import { useCallback, useEffect, useRef, useState } from 'react'
import { load, save } from '../lib/storage.js'
import { supabase } from '../lib/supabase.js'
import { useToast } from '../components/Toast.jsx'

const KEY = 'kurdzhir-chats-classic-v1'
const MAX_CHATS = 60

function storageKey(owner) {
  return `${KEY}:${owner}`
}

function normalize(list) {
  if (!Array.isArray(list)) return []
  return list.filter((chat) => chat && typeof chat.id === 'string' && Array.isArray(chat.messages))
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    updatedAt: Date.parse(row.updated_at) || Date.now(),
    messages: Array.isArray(row.messages) ? row.messages : [],
    pinned: Boolean(row.pinned),
  }
}

function toRow(chat, userId) {
  return {
    id: chat.id,
    user_id: userId,
    title: chat.title,
    updated_at: new Date(chat.updatedAt || Date.now()).toISOString(),
    messages: chat.messages,
    pinned: Boolean(chat.pinned),
  }
}

function mergeChats(local, remote) {
  const merged = new Map(local.map((chat) => [chat.id, chat]))
  for (const chat of remote) {
    const cached = merged.get(chat.id)
    if (!cached || (chat.updatedAt || 0) >= (cached.updatedAt || 0)) {
      merged.set(chat.id, chat)
    }
  }
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Anonymous chats remain local; signed-in chats sync to the user's Supabase account. */
export function useChats(userId = null, authLoading = false) {
  const notify = useToast()
  const owner = userId || 'guest'
  const [stored, setStored] = useState(() => ({
    owner: 'guest',
    chats: normalize(load(storageKey('guest'), load(KEY, []))),
  }))
  const [syncReadyFor, setSyncReadyFor] = useState(null)
  const [syncStatus, setSyncStatus] = useState('local')
  const syncErrorShown = useRef(false)
  const chats = !authLoading && stored.owner === owner ? stored.chats : []

  useEffect(() => {
    if (authLoading) return undefined

    let active = true
    const cached = normalize(load(storageKey(owner), owner === 'guest' ? load(KEY, []) : []))
    setStored({ owner, chats: cached })
    setSyncReadyFor(null)
    setSyncStatus(userId ? 'loading' : 'local')

    if (!userId || !supabase) return undefined

    const loadRemote = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('id,title,updated_at,messages,pinned')
        .order('updated_at', { ascending: false })
        .limit(MAX_CHATS)

      if (error) throw error
      if (!active) return

      const remote = (data || []).map(fromRow)
      const guestChats = normalize(load(storageKey('guest'), load(KEY, [])))
      const merged = mergeChats(mergeChats(cached, guestChats), remote).slice(0, MAX_CHATS)
      setStored({ owner, chats: merged })
      setSyncReadyFor(owner)
      setSyncStatus('synced')
      syncErrorShown.current = false
    }

    loadRemote().catch((error) => {
      if (!active) return
      console.error('[Chat Sync Load Error]', error)
      setSyncReadyFor(owner)
      setSyncStatus('error')
      if (!syncErrorShown.current) {
        notify('نەتوانرا چاتەکان لە هەژمارەکەت وەربگیرێن. پەیوەندی ئینتەرنێت و Supabase بپشکنە.')
        syncErrorShown.current = true
      }
    })

    return () => {
      active = false
    }
  }, [owner, userId, authLoading, notify])

  const setChats = useCallback((update) => {
    setStored((current) => {
      const previous =
        current.owner === owner
          ? current.chats
          : normalize(load(storageKey(owner), []))
      const next = typeof update === 'function' ? update(previous) : update
      return { owner, chats: normalize(next) }
    })
  }, [owner])

  useEffect(() => {
    if (stored.owner !== owner || authLoading) return
    const error = save(storageKey(owner), stored.chats.slice(0, MAX_CHATS))

    if (error) {
      console.error('[Chat Storage Error] نەتوانرا گفتوگۆکان خەزن بکرێن.', error)
      notify('گفتوگۆکان خەزن نەکران. شوێنی خەزن لە براوزەر پڕە یان بەردەست نییە.')
    }
  }, [stored, owner, authLoading, notify])

  useEffect(() => {
    if (!userId || !supabase || syncReadyFor !== owner || stored.owner !== owner) {
      return undefined
    }

    let active = true
    const timer = setTimeout(async () => {
      try {
        const current = stored.chats.slice(0, MAX_CHATS)
        const { data: existing, error: readError } = await supabase
          .from('chats')
          .select('id')
          .limit(MAX_CHATS)
        if (readError) throw readError

        const currentIds = new Set(current.map((chat) => chat.id))
        const removedIds = (existing || [])
          .map((row) => row.id)
          .filter((id) => !currentIds.has(id))

        if (removedIds.length > 0) {
          const { error } = await supabase.from('chats').delete().in('id', removedIds)
          if (error) throw error
        }

        if (current.length > 0) {
          const { error } = await supabase
            .from('chats')
            .upsert(current.map((chat) => toRow(chat, userId)), { onConflict: 'id' })
          if (error) throw error
        }

        if (active) {
          setSyncStatus('synced')
          syncErrorShown.current = false
          try {
            localStorage.removeItem(storageKey('guest'))
            localStorage.removeItem(KEY)
          } catch (error) {
            console.error('[Legacy Chat Cache Cleanup Error]', error)
          }
        }
      } catch (error) {
        if (!active) return
        console.error('[Chat Sync Save Error]', error)
        setSyncStatus('error')
        if (!syncErrorShown.current) {
          notify('چاتەکان لەسەر هەژمارەکەت sync نەبوون. دوای پشکنینی ئینتەرنێت دووبارە هەوڵ دەدرێتەوە.')
          syncErrorShown.current = true
        }
      }
    }, 500)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [stored, owner, userId, syncReadyFor, notify])

  useEffect(() => {
    if (!userId || !supabase || syncReadyFor !== owner) return undefined

    const channel = supabase
      .channel(`chats:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${userId}` },
        (payload) => {
          setStored((current) => {
            if (current.owner !== owner) return current
            const existing = current.chats
            if (payload.eventType === 'DELETE') {
              return {
                owner,
                chats: existing.filter((chat) => chat.id !== payload.old.id),
              }
            }
            const incoming = fromRow(payload.new)
            const found = existing.find((chat) => chat.id === incoming.id)
            if (found && found.updatedAt > incoming.updatedAt) return current
            return { owner, chats: mergeChats(existing, [incoming]).slice(0, MAX_CHATS) }
          })
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Chat Sync Realtime Error]', status)
          setSyncStatus('error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [owner, userId, syncReadyFor])

  return [chats, setChats, { syncStatus }]
}
