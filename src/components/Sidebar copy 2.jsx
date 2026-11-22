
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Sun from './Sun.jsx'
import AccountPanel from './AccountPanel.jsx'
import { useToast } from './Toast.jsx'
import { NAME } from '../data.js'
import { chatMatches, groupChats } from '../lib/chats.js'
import { copyText } from '../lib/clipboard.js'

export default function Sidebar({
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onTogglePin,
  sunState,
  isLive,
  collapsed,
  compactLayout,
  mobileOpen,
  onToggleCollapse,
  onResize,
  sidebarWidth,
  account,
}) {
  const [query, setQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const resizeRef = useRef(null)
  const menuRefs = useRef(new Map())
  const notify = useToast()

  useEffect(() => {
    if (openMenuId === null) return

    const closeOnOutsideClick = (event) => {
      if (!menuRefs.current.get(openMenuId)?.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenuId(null)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenuId])

  const groups = useMemo(
    () => groupChats(chats.filter((c) => chatMatches(c, query))),
    [chats, query],
  )

  const startResize = (event) => {
    if (compactLayout || event.button !== 0) return

    event.preventDefault()
    const side = event.currentTarget.closest('.side')
    resizeRef.current = {
      x: event.clientX,
      width: collapsed ? 64 : sidebarWidth,
      collapsed,
      rtl: window.getComputedStyle(side).direction === 'rtl',
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const resize = (event) => {
    if (!resizeRef.current) return

    const { x, width, rtl } = resizeRef.current
    onResize(width + (rtl ? x - event.clientX : event.clientX - x))
  }

  const stopResize = (event) => {
    const start = resizeRef.current
    if (!start) return

    if (
      event.type === 'pointerup' &&
      Math.abs(event.clientX - start.x) < 4
    ) {
      onToggleCollapse()
    }

    resizeRef.current = null
  }

  const adjustWidth = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const side = event.currentTarget.closest('.side')
    const rtl = window.getComputedStyle(side).direction === 'rtl'
    const increase = rtl
      ? event.key === 'ArrowLeft'
      : event.key === 'ArrowRight'

    if (collapsed) {
      if (increase) onResize(220)
      return
    }

    onResize(sidebarWidth + (increase ? 16 : -16))
  }

  const expandedByAction = () => {
    if (collapsed) onToggleCollapse()
  }

  const copyChat = async (chat) => {
    const text = [
      `# ${chat.title}`,
      ...chat.messages
        .filter((message) => !message.error)
        .map((message) => {
          const role = message.role === 'ai' ? 'KURDZHIR AI' : 'بەکارهێنەر'
          const files = (message.files || [])
            .map((file) => `[فایل: ${file.name}]`)
            .join('\n')
          return `## ${role}\n${[message.text, files].filter(Boolean).join('\n\n')}`
        }),
    ].join('\n\n')

    const copied = await copyText(text)
    setOpenMenuId(null)
    notify(copied ? 'گفتوگۆکە کۆپی کرا.' : 'کۆپیکردنی گفتوگۆکە سەرکەوتوو نەبوو.')
  }

  return (
    <aside
      id="sidebar"
      className={'side' + (collapsed ? ' collapsed' : '')}
      aria-label="مێژووی گفتوگۆکان"
    >
      <div className="side-head">
        <div className="brand">
          <Sun size={34} state={sunState} />
          <span dir="ltr">KURDZHIR AI</span>
        </div>
        <button
          className="icon-btn side-toggle"
          type="button"
          aria-label={compactLayout
            ? mobileOpen ? 'داخستنی لیستی گفتوگۆکان' : 'کردنەوەی لیستی گفتوگۆکان'
            : collapsed ? 'کردنەوەی لیستی گفتوگۆکان' : 'بچووککردنەوەی سایدبار'}
          aria-expanded={compactLayout ? mobileOpen : !collapsed}
          aria-controls="sidebar"
          onClick={onToggleCollapse}
        >
          <Icon name={compactLayout && mobileOpen ? 'close' : 'menu'} size={18} />
        </button>
      </div>

      <button
        className="new"
        type="button"
        aria-label="گفتوگۆی نوێ"
        title={collapsed ? 'گفتوگۆی نوێ' : undefined}
        onClick={onNew}
      >
        <Icon name="plus" size={18} strokeWidth={2.4} />
        <span className="control-label">گفتوگۆی نوێ</span>
      </button>

      {collapsed ? (
        <button
          className="rail-action"
          type="button"
          aria-label="گەڕان لە گفتوگۆکان"
          title="گەڕان لە گفتوگۆکان"
          onClick={expandedByAction}
        >
          <Icon name="search" size={18} />
        </button>
      ) : (
        <label className="search">
          <Icon name="search" size={16} />

          <input
            type="search"
            placeholder="گەڕان لە گفتوگۆکان"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}

      <nav className="hist" aria-label="گفتوگۆکان">
        {chats.length === 0 && (
          <p className="empty">
            هێشتا گفتوگۆیەکت نییە. یەکەمین پرسیارت بنووسە.
          </p>
        )}

        {chats.length > 0 && groups.length === 0 && (
          <p className="empty">
            هیچ ئەنجامێک نەدۆزرایەوە.
          </p>
        )}

        {groups.map((g) => (
          <div className="grp" key={g.label}>
            <h4>{g.label}</h4>

            {g.items.map((c) => {
              const current = c.id === activeId

              return (
                <div
                  className={'hrow' + (current ? ' cur' : '')}
                  key={c.id}
                >
                  <button
                    type="button"
                    className="ht"
                    aria-current={current ? 'true' : undefined}
                    title={c.title}
                    onClick={() => onSelect(c.id)}
                  >
                    {c.title}
                  </button>

                  {c.pinned && (
                    <span className="row-pin" title="پینکراو">
                      <Icon name="bookmark" size={14} />
                    </span>
                  )}
                  <div
                    className="row-menu-wrap"
                    ref={(element) => {
                      if (element) menuRefs.current.set(c.id, element)
                      else menuRefs.current.delete(c.id)
                    }}
                  >
                    <button
                      type="button"
                      className="row-more"
                      aria-label={'هەڵبژاردەکانی ' + c.title}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === c.id}
                      onClick={() => setOpenMenuId((current) => current === c.id ? null : c.id)}
                    >
                      <Icon name="more" size={16} />
                    </button>
                    {openMenuId === c.id && (
                      <div className="row-menu" role="menu" aria-label={'هەڵبژاردەکانی ' + c.title}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => copyChat(c)}
                        >
                          <Icon name="copy" size={15} />
                          کۆپیکردنی چات
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onTogglePin(c.id)
                            setOpenMenuId(null)
                          }}
                        >
                          <Icon name="bookmark" size={15} />
                          {c.pinned ? 'لابردنی پین' : 'پینکردن'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null)
                            const title = window.prompt('ناوی نوێی گفتوگۆ:', c.title)
                            if (title?.trim()) onRename(c.id, title.trim())
                          }}
                        >
                          <Icon name="pen" size={15} />
                          ناونانەوە
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="danger"
                          onClick={() => {
                            setOpenMenuId(null)
                            onDelete(c.id)
                          }}
                        >
                          <Icon name="trash" size={15} />
                          سڕینەوە
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      <AccountPanel
        {...account}
        trigger={(
          <>
            <span className="me-content">
              <span className="me-t">
                <b>{NAME}</b>
                <small>
                  <span className={'live-dot' + (isLive ? ' on' : '')} />
                  {isLive ? 'بەستراوە بە AI' : 'دەمۆ'}
                </small>
              </span>
              <span className="avatar">{NAME.charAt(0)}</span>
            </span>
          </>
        )}
      />

      <div
        className="side-resizer"
        role="separator"
        aria-label="ڕاکێشان بۆ گۆڕینی پانی سایدبار"
        aria-orientation="vertical"
        aria-valuemin={64}
        aria-valuemax={420}
        aria-valuenow={collapsed ? 64 : sidebarWidth}
        tabIndex={compactLayout ? -1 : 0}
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onKeyDown={adjustWidth}
      />
    </aside>
  )
}
