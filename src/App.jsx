
import { useCallback, useEffect, useRef, useState } from 'react'

import Icon from './components/Icon.jsx'
import Sun from './components/Sun.jsx'
import Sidebar from './components/Sidebar.jsx'
import Welcome from './components/Welcome.jsx'
import Composer from './components/Composer.jsx'
import AISettings from './components/AISettings.jsx'

import {
  AIMessage,
  ThinkingMessage,
  UserMessage,
} from './components/Message.jsx'

import { useToast } from './components/Toast.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useChats } from './hooks/useChats.js'
import { useAuth } from './hooks/useAuth.js'
import { askAI, IS_LIVE } from './api.js'
import { MODEL_LABEL } from './data.js'

import {
  keepPinnedChats,
  titleFrom,
  toApiMessages,
  uid,
} from './lib/chats.js'

import { copyText } from './lib/clipboard.js'
import { load, save } from './lib/storage.js'

const AI_SETTINGS_KEY = 'kurdzhir-ai-settings-v1'
const DEFAULT_AI_SETTINGS = {
  provider: 'gemini',
  model: 'gemini-3.1-flash-lite',
  style: 'balanced',
  length: 'medium',
}

function getInitialAISettings() {
  const saved = load(AI_SETTINGS_KEY, {})
  return {
    provider: typeof saved?.provider === 'string' ? saved.provider : null,
    model: typeof saved?.model === 'string' ? saved.model : DEFAULT_AI_SETTINGS.model,
    style: ['balanced', 'creative', 'formal', 'friendly'].includes(saved?.style)
      ? saved.style
      : DEFAULT_AI_SETTINGS.style,
    length: ['short', 'medium', 'long'].includes(saved?.length)
      ? saved.length
      : DEFAULT_AI_SETTINGS.length,
  }
}

export default function App() {
  const notify = useToast()
  const { isDark, toggle } = useTheme()
  const auth = useAuth()
  const [chats, setChats, chatSync] = useChats(auth.user?.id, auth.loading)

  const [compactLayout, setCompactLayout] = useState(() =>
    window.matchMedia('(max-width: 700px)').matches,
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.matchMedia('(max-width: 700px)').matches,
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(296)
  const [activeId, setActiveId] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [thinkingChatId, setThinkingChatId] = useState(null)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const [typingId, setTypingId] = useState(null)
  const [focusTick, setFocusTick] = useState(0)
  const [aiSettings, setAISettings] = useState(getInitialAISettings)
  const [availableModels, setAvailableModels] = useState([DEFAULT_AI_SETTINGS.model])
  const [availableProviders, setAvailableProviders] = useState([
    {
      id: 'gemini',
      label: 'Gemini',
      models: [DEFAULT_AI_SETTINGS.model],
      defaultModel: DEFAULT_AI_SETTINGS.model,
    },
  ])
  const [activeTopPanel, setActiveTopPanel] = useState(null)

  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const stickRef = useRef(true)

  const chat = chats.find((c) => c.id === activeId) || null
  const messages = chat ? chat.messages : []

  const busy =
    thinking || streamingMessage !== null || typingId !== null

  const activeThinking = thinking && thinkingChatId === activeId
  const activeStreaming = streamingMessage?.chatId === activeId
  const sunState = activeThinking
    ? 'thinking'
    : activeStreaming ||
        (typingId !== null && messages.some((message) => message.id === typingId))
      ? 'typing'
      : 'idle'

  useEffect(() => {
    let active = true
    fetch('/api/config')
      .then((response) => {
        if (!response.ok) throw new Error(`API config failed (${response.status})`)
        return response.json()
      })
      .then((config) => {
        if (!active || !Array.isArray(config.models) || config.models.length === 0) return
        setAvailableModels(config.models)
        const providers = Array.isArray(config.providers)
          ? config.providers.filter((provider) =>
              provider?.available !== false &&
              typeof provider?.id === 'string' &&
              Array.isArray(provider.models) &&
              provider.models.length > 0,
            )
          : []
        if (providers.length > 0) setAvailableProviders(providers)
        const resolveProvider = (current) =>
          providers.find((provider) =>
            provider.id === current.provider && provider.models.includes(current.model),
          )
          || providers.find((provider) => provider.models.includes(current.model))
          || providers.find((provider) => provider.id === current.provider)
          || providers[0]
        setAISettings((current) => {
          const provider = resolveProvider(current)
          return {
            ...current,
            provider: provider?.id || current.provider,
            model: provider?.models.includes(current.model)
              ? current.model
              : provider?.defaultModel || provider?.models[0] || config.defaultModel,
          }
        })
      })
      .catch((error) => {
        console.error('[AI Settings Config Error]', error)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    const error = save(AI_SETTINGS_KEY, aiSettings)
    if (error) console.error('[AI Settings Storage Error]', error)
  }, [aiSettings])

  const exportChats = useCallback(() => {
    const backup = {
      format: 'kurdzhir-chat-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      chats,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `kurdzhir-chats-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [chats])

  const importChats = useCallback(async (backup) => {
    if (
      !backup ||
      backup.format !== 'kurdzhir-chat-backup' ||
      backup.version !== 1 ||
      !Array.isArray(backup.chats)
    ) {
      throw new Error('فایلی پشتگیریی KURDZHIR AI نییە.')
    }

    const imported = backup.chats.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.messages),
    )
    if (imported.length !== backup.chats.length) {
      throw new Error('هەندێک گفتوگۆ لە فایلی پشتگیری دروست نییە.')
    }

    setChats((current) => {
      const byId = new Map(current.map((chat) => [chat.id, chat]))
      for (const chat of imported) {
        byId.set(chat.id, chat)
      }
      return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 60)
    })
  }, [setChats])

  const signOut = useCallback(async () => {
    try {
      await auth.signOut()
      setActiveId(null)
      notify('لە هەژمارەکەت چوویتە دەرەوە.')
    } catch (error) {
      console.error('[Sign Out Error]', error)
      notify(error?.message || 'چوونەدەرەوە سەرکەوتوو نەبوو.')
    }
  }, [auth, notify])

  const deleteAccount = useCallback(async () => {
    await auth.deleteAccount()
    if (auth.user?.id) {
      localStorage.removeItem(`kurdzhir-chats-classic-v1:${auth.user.id}`)
    }
    setChats([])
    setActiveId(null)
  }, [auth, setChats])

  const toggleSidebar = useCallback(() => {
    if (compactLayout) {
      setSidebarOpen((open) => !open)
      return
    }

    setSidebarCollapsed((collapsed) => !collapsed)
  }, [compactLayout])

  const resizeSidebar = useCallback((width) => {
    if (width < 200) {
      setSidebarCollapsed(true)
      return
    }

    setSidebarWidth(Math.max(220, Math.min(420, width)))
    setSidebarCollapsed(false)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 700px)')
    const handleChange = (event) => {
      setCompactLayout(event.matches)
      setSidebarCollapsed(event.matches)
      setSidebarOpen(false)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!compactLayout || !sidebarOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [compactLayout, sidebarOpen])

  // زیادکردنی نامە بۆ گفتوگۆ
  const addMessage = useCallback(
    (cid, msg) => {
      setChats((cs) =>
        cs.map((c) =>
          c.id === cid
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: [...c.messages, msg],
              }
            : c,
        ),
      )
    },
    [setChats],
  )

  // وەرگرتنی وەڵامی AI
  const reply = useCallback(
    async (cid, history) => {
      const controller = new AbortController()
      abortRef.current = controller
      const responseId = uid()
      let streamedText = ''

      setThinking(true)
      setThinkingChatId(cid)

      try {
        const text = await askAI(
          toApiMessages(history),
          controller.signal,
          (chunk) => {
            streamedText += chunk
            setThinking(false)
            setStreamingMessage({
              id: responseId,
              chatId: cid,
              text: streamedText,
            })
          },
          aiSettings,
        )

        if (streamedText) {
          addMessage(cid, {
            id: responseId,
            role: 'ai',
            text: streamedText,
          })
        } else {
          const msg = {
            id: responseId,
            role: 'ai',
            text: String(text ?? ''),
          }

          setTypingId(msg.id)
          addMessage(cid, msg)
        }
      } catch (err) {
        if (streamedText) {
          addMessage(cid, {
            id: responseId,
            role: 'ai',
            text: streamedText,
          })
        }

        if (err?.name !== 'AbortError') {
          addMessage(cid, {
            id: uid(),
            role: 'ai',
            error: true,
            text:
              typeof err?.message === 'string' && err.message.trim()
                ? err.message
                : 'کێشەیەک ڕوویدا و وەڵام نەگەیشت. ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵبدەرەوە.',
          })
        }
      } finally {
        setThinking(false)
        setThinkingChatId((current) => current === cid ? null : current)
        setStreamingMessage(null)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [addMessage, aiSettings],
  )

  // ناردنی نامە
  const send = useCallback(
    (text, files = []) => {
      const q = text.trim()

      if ((!q && files.length === 0) || busy) return

      const userMsg = {
        id: uid(),
        role: 'user',
        text: q || 'ئەم فایلانە لێکبدەرەوە',
        files,
      }

      const history = [...messages, userMsg]
      let cid = activeId

      if (chat) {
        addMessage(cid, userMsg)
      } else {
        cid = uid()

        const created = {
          id: cid,
          title: titleFrom(q || files[0]?.name || ''),
          updatedAt: Date.now(),
          messages: [userMsg],
        }

        setChats((cs) => [created, ...cs])
        setActiveId(cid)
      }

      stickRef.current = true
      reply(cid, history)
    },
    [
      busy,
      messages,
      chat,
      activeId,
      addMessage,
      setChats,
      reply,
    ],
  )

  // دووبارە هەوڵدانەوەی وەڵام
  const retry = useCallback(() => {
    if (busy || !chat || messages.length === 0) return

    const last = messages[messages.length - 1]

    if (last.role !== 'ai') return

    const base = messages.slice(0, -1)

    setChats((cs) =>
      cs.map((c) =>
        c.id === chat.id
          ? { ...c, messages: base }
          : c,
      ),
    )

    stickRef.current = true
    reply(chat.id, base)
  }, [busy, chat, messages, setChats, reply])

  // وەستاندنی وەڵام
  const stop = useCallback(() => {
    abortRef.current?.abort()
    setTypingId(null)
  }, [])

  const onTyped = useCallback((id) => {
    setTypingId((cur) => (cur === id ? null : cur))
  }, [])

  // سکرۆڵی خۆکار
  const onTick = useCallback(() => {
    const el = scrollRef.current

    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  // لایککردنی نامەی AI
  const like = (msgId) =>
    setChats((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? { ...m, liked: !m.liked }
                  : m,
              ),
            }
          : c,
      ),
    )

  // گفتوگۆی نوێ
  const newChat = useCallback(() => {
    setActiveId(null)
    setSidebarOpen(false)
    setFocusTick((t) => t + 1)
  }, [])

  // کردنەوەی گفتوگۆ
  const openChat = useCallback((id) => {
    setActiveId(id)
    setSidebarOpen(false)
    stickRef.current = true
  }, [])

  // سڕینەوەی گفتوگۆ
  const deleteChat = useCallback(
    (id) => {
      const removed = chats.find((c) => c.id === id)

      if (!removed) return

      setChats((cs) => cs.filter((c) => c.id !== id))

      if (activeId === id) {
        setActiveId(null)
      }

      notify('گفتوگۆکە سڕایەوە', {
        label: 'گەڕاندنەوە',
        run: () =>
          setChats((cs) =>
            cs.some((c) => c.id === id)
              ? cs
              : [removed, ...cs],
          ),
      })
    },
    [chats, activeId, notify, setChats],
  )

  const deleteUnpinnedChats = useCallback(() => {
    const removedChats = chats.filter((item) => !item.pinned)
    if (removedChats.length === 0) return

    setChats(keepPinnedChats)
    if (removedChats.some((item) => item.id === activeId)) setActiveId(null)
    notify(`${removedChats.length} چاتی ناپینکراو سڕایەوە. چاتە پینکراوەکان پارێزران.`)
  }, [activeId, chats, notify, setChats])

  const renameChat = useCallback((id, title) => {
    setChats((current) =>
      current.map((item) =>
        item.id === id ? { ...item, title, updatedAt: Date.now() } : item,
      ),
    )
  }, [setChats])

  const togglePinChat = useCallback((id) => {
    setChats((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, pinned: !item.pinned, updatedAt: Date.now() }
          : item,
      ),
    )
  }, [setChats])

  // سکرۆڵ بۆ کۆتایی گفتوگۆ
  useEffect(() => {
    const el = scrollRef.current

    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [activeId])

  useEffect(() => {
    const el = scrollRef.current

    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length, thinking, streamingMessage?.text])

  return (
    <div
      className={'app' + (sidebarOpen ? ' mobile-open' : '')}
      style={{
        '--sidebar-width': `${sidebarCollapsed && !(compactLayout && sidebarOpen) ? 64 : sidebarWidth}px`,
      }}
      dir="rtl"
      lang="ckb"
    >
      <Sidebar
        chats={chats}
        activeId={activeId}
        onSelect={openChat}
        onNew={newChat}
        onDelete={deleteChat}
        onRename={renameChat}
        onTogglePin={togglePinChat}
        sunState={sunState}
        isLive={IS_LIVE}
        collapsed={sidebarCollapsed && !(compactLayout && sidebarOpen)}
        compactLayout={compactLayout}
        mobileOpen={sidebarOpen}
        onToggleCollapse={toggleSidebar}
        onResize={resizeSidebar}
        sidebarWidth={sidebarWidth}
        account={{
          user: auth.user,
          loading: auth.loading,
          configured: auth.configured,
          syncStatus: chatSync.syncStatus,
          onSignIn: auth.signIn,
          onSignOut: signOut,
          onExport: exportChats,
          onImport: importChats,
          onDeleteAccount: deleteAccount,
          deletableChatCount: chats.filter((item) => !item.pinned).length,
          onDeleteChats: deleteUnpinnedChats,
          open: activeTopPanel === 'account',
          onOpenChange: (open) => setActiveTopPanel(open ? 'account' : null),
        }}
      />

      <div
        className="scrim"
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      <main className="main">
        <header className="top">
          {compactLayout && (
            <button
              className="icon-btn mobile-menu"
              type="button"
              aria-label="کردنەوەی لیستی گفتوگۆکان"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" size={19} />
            </button>
          )}
          <span className="pill">
            <Sun size={18} state={sunState} />
            <span dir="ltr">{aiSettings.model || MODEL_LABEL}</span>
          </span>

          <div className="tools">
            <AISettings
              settings={aiSettings}
              models={availableModels}
              providers={availableProviders}
              onChange={setAISettings}
              open={activeTopPanel === 'settings'}
              onOpenChange={(open) => setActiveTopPanel(open ? 'settings' : null)}
            />
            <button
              className="icon-btn"
              type="button"
              aria-label="گۆڕینی ڕووکار"
              onClick={toggle}
            >
              <Icon
                name={isDark ? 'sun' : 'moon'}
                size={19}
              />
            </button>
          </div>
        </header>

        <div
          className="scroll"
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget

            stickRef.current =
              el.scrollHeight -
                el.scrollTop -
                el.clientHeight <
              140
          }}
        >
          <div className={'col' + (!chat ? ' welcome-col' : '')}>
            {!chat && <Welcome />}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserMessage
                  key={m.id}
                  msg={m}
                  onCopy={() =>
                    copyText(m.text).then((ok) =>
                      notify(
                        ok
                          ? 'پەیامەکەت کۆپی کرا.'
                          : 'کۆپی نەکرا. دەقەکە بە دەست هەڵبژێرە.',
                      ),
                    )
                  }
                />
              ) : (
                <AIMessage
                  key={m.id}
                  msg={m}
                  isLast={i === messages.length - 1}
                  typing={typingId === m.id}
                  busy={busy}
                  onTick={onTick}
                  onTyped={() => onTyped(m.id)}
                  onCopy={() =>
                    copyText(m.text).then((ok) =>
                      notify(
                        ok
                          ? 'کۆپی کرا'
                          : 'کۆپی نەکرا. دەقەکە بە دەست هەڵبژێرە.',
                      ),
                    )
                  }
                  onLike={() => like(m.id)}
                  onRetry={retry}
                />
              ),
            )}

            {streamingMessage?.chatId === activeId && (
              <AIMessage
                key={streamingMessage.id}
                msg={streamingMessage}
                isLast
                streaming
                busy
              />
            )}

            {activeThinking && <ThinkingMessage />}
          </div>
        </div>

        <Composer
          onSend={send}
          busy={busy}
          onStop={stop}
          focusTick={focusTick}
        />
      </main>
    </div>
  )
}
