import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Sun from './Sun.jsx'
import AccountPanel from './AccountPanel.jsx'
import { useToast } from './Toast.jsx'
import { NAME } from '../data.js'
import { chatMatches, groupChats } from '../lib/chats.js'
import { copyText } from '../lib/clipboard.js'

function highlight(title, query) {
  const q = query.trim()
  if (!q) return title
  const index = title.toLowerCase().indexOf(q.toLowerCase())
  if (index < 0) return title
  return (
    <>
      {title.slice(0, index)}
      <mark>{title.slice(index, index + q.length)}</mark>
      {title.slice(index + q.length)}
    </>
  )
}

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
  const [menuPos, setMenuPos] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [wantSearch, setWantSearch] = useState(false)

  const resizeRef = useRef(null)
  const menuRefs = useRef(new Map())
  const navRef = useRef(null)
  const searchRef = useRef(null)
  const cancelRenameRef = useRef(false)
  const notify = useToast()

  const sidebarVisible = compactLayout ? mobileOpen : !collapsed

  const groups = useMemo(
    () => groupChats(chats.filter((c) => chatMatches(c, query))),
    [chats, query],
  )

  const closeMenu = (restoreFocus = true) => {
    const id = openMenuId
    setOpenMenuId(null)
    if (restoreFocus && id !== null) {
      requestAnimationFrame(() => {
        menuRefs.current.get(id)?.querySelector('.row-more')?.focus()
      })
    }
  }

  const focusRow = (id) => {
    requestAnimationFrame(() => {
      const row = navRef.current?.querySelector(`[data-chat-id="${CSS.escape(String(id))}"] .ht`)
      row?.focus()
    })
  }

  // مینیو: کلیکی دەرەوە، Escape، گۆڕینی قەبارە و سکرۆڵ
  useEffect(() => {
    if (openMenuId === null) return

    const closeOnOutsideClick = (event) => {
      if (!menuRefs.current.get(openMenuId)?.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu(true)
      }
    }
    const closeSilently = () => setOpenMenuId(null)
    const nav = navRef.current

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeSilently)
    nav?.addEventListener('scroll', closeSilently, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeSilently)
      nav?.removeEventListener('scroll', closeSilently)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMenuId])

  // شوێنی مینیو: position: fixed، بەپێی بۆشایی، هەرگیز نابڕدرێت
  useLayoutEffect(() => {
    if (openMenuId === null) {
      setMenuPos(null)
      return
    }
    const wrap = menuRefs.current.get(openMenuId)
    const trigger = wrap?.querySelector('.row-more')
    const menu = wrap?.querySelector('.row-menu')
    if (!trigger || !menu) return

    const t = trigger.getBoundingClientRect()
    const width = menu.offsetWidth
    const height = menu.offsetHeight
    const rtl = window.getComputedStyle(trigger).direction === 'rtl'
    const gap = 6
    const edge = 8

    let x = rtl ? t.left : t.right - width
    x = Math.min(Math.max(edge, x), window.innerWidth - width - edge)

    const spaceBelow = window.innerHeight - t.bottom
    const placeTop = spaceBelow < height + gap + edge && t.top > height + gap + edge
    const y = placeTop ? t.top - height - gap : t.bottom + gap

    setMenuPos({ x, y, placement: placeTop ? 'top' : 'bottom' })
  }, [openMenuId])

  // فۆکەس بۆ یەکەم هەڵبژاردەی مینیو
  useEffect(() => {
    if (openMenuId === null || !menuPos) return
    menuRefs.current.get(openMenuId)?.querySelector('[role="menuitem"]')?.focus()
  }, [openMenuId, menuPos])

  // Escape بۆ داخستنی لیستی مۆبایل
  useEffect(() => {
    const onKey = (event) => {
      if (event.defaultPrevented) return

      if (
        event.key === 'Escape' &&
        compactLayout &&
        mobileOpen &&
        openMenuId === null &&
        renamingId === null &&
        confirmId === null
      ) {
        onToggleCollapse()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [compactLayout, mobileOpen, openMenuId, renamingId, confirmId, onToggleCollapse])

  useEffect(() => {
    if (!wantSearch || !sidebarVisible) return
    setWantSearch(false)
    const input = searchRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [wantSearch, sidebarVisible])

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
    setWantSearch(true)
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
    closeMenu(true)
    notify(copied ? 'گفتوگۆکە کۆپی کرا.' : 'کۆپیکردنی گفتوگۆکە سەرکەوتوو نەبوو.')
  }

  // ناونانەوە لەناو ڕیزەکە، بێ window.prompt
  const startRename = (chat) => {
    cancelRenameRef.current = false
    setConfirmId(null)
    setOpenMenuId(null)
    setRenameValue(chat.title)
    setRenamingId(chat.id)
  }

  const commitRename = (chat) => {
    if (cancelRenameRef.current) return
    cancelRenameRef.current = true
    const title = renameValue.trim()
    setRenamingId(null)
    if (title && title !== chat.title) {
      onRename(chat.id, title)
      notify('ناوی گفتوگۆ نوێکرایەوە.')
    }
    focusRow(chat.id)
  }

  const cancelRename = (chat) => {
    cancelRenameRef.current = true
    setRenamingId(null)
    focusRow(chat.id)
  }

  // سڕینەوە بە دوو هەنگاو لەناو ڕیزەکە
  const askDelete = (chat) => {
    setOpenMenuId(null)
    setRenamingId(null)
    setConfirmId(chat.id)
  }

  const confirmDelete = (chat) => {
    setConfirmId(null)
    onDelete(chat.id)
  }

  const onNavKeyDown = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.classList.contains('ht')) return

    const rows = [...(navRef.current?.querySelectorAll('.ht') || [])]
    const index = rows.indexOf(target)
    const chat = chats.find(
      (c) => String(c.id) === target.closest('.hrow')?.dataset.chatId,
    )

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        rows[index + 1]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        if (index > 0) rows[index - 1].focus()
        else searchRef.current?.focus()
        break
      case 'Home':
        event.preventDefault()
        rows[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        rows[rows.length - 1]?.focus()
        break
      case 'F2':
        if (chat) {
          event.preventDefault()
          startRename(chat)
        }
        break
      case 'Delete':
        if (chat) {
          event.preventDefault()
          askDelete(chat)
        }
        break
      default:
    }
  }

  const onSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      navRef.current?.querySelector('.ht')?.focus()
    } else if (event.key === 'Enter') {
      const first = groups.flatMap((g) => g.items)[0]
      if (first) {
        event.preventDefault()
        onSelect(first.id)
      }
    } else if (event.key === 'Escape') {
      if (query) {
        event.preventDefault()
        setQuery('')
      } else {
        event.currentTarget.blur()
      }
    }
  }

  const onMenuKeyDown = (event) => {
    const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]')]
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length].focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length].focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      items[0].focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1].focus()
    } else if (event.key === 'Tab') {
      setOpenMenuId(null)
    }
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
            ref={searchRef}
            type="search"
            placeholder="گەڕان لە گفتوگۆکان"
            aria-label="گەڕان لە گفتوگۆکان"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />

          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="پاککردنەوەی گەڕان"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </label>
      )}

      <nav className="hist" aria-label="گفتوگۆکان" ref={navRef} onKeyDown={onNavKeyDown}>
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
              const renaming = renamingId === c.id
              const confirming = confirmId === c.id

              return (
                <div
                  className={
                    'hrow' +
                    (current ? ' cur' : '') +
                    (renaming ? ' renaming' : '') +
                    (confirming ? ' confirming' : '')
                  }
                  key={c.id}
                  data-chat-id={c.id}
                >
                  {renaming ? (
                    <input
                      className="ht-edit"
                      type="text"
                      value={renameValue}
                      aria-label="ناوی نوێی گفتوگۆ"
                      maxLength={120}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitRename(c)
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelRename(c)
                        }
                      }}
                    />
                  ) : confirming ? (
                    <div
                      className="row-confirm"
                      role="alertdialog"
                      aria-label="دڵنیابوونەوە لە سڕینەوە"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) setConfirmId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setConfirmId(null)
                          focusRow(c.id)
                        }
                      }}
                    >
                      <span>سڕینەوەی ئەم گفتوگۆیە؟</span>
                      <button
                        type="button"
                        className="row-confirm-yes"
                        onClick={() => confirmDelete(c)}
                      >
                        سڕینەوە
                      </button>
                      <button
                        type="button"
                        className="row-confirm-no"
                        autoFocus
                        onClick={() => {
                          setConfirmId(null)
                          focusRow(c.id)
                        }}
                      >
                        پاشگەزبوونەوە
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ht"
                        aria-current={current ? 'true' : undefined}
                        title={c.title}
                        onClick={() => onSelect(c.id)}
                        onDoubleClick={() => startRename(c)}
                      >
                        {highlight(c.title, query)}
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
                          onClick={() => setOpenMenuId((id) => (id === c.id ? null : c.id))}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown' && openMenuId !== c.id) {
                              e.preventDefault()
                              setOpenMenuId(c.id)
                            }
                          }}
                        >
                          <Icon name="more" size={16} />
                        </button>
                        {openMenuId === c.id && (
                          <div
                            className="row-menu"
                            role="menu"
                            aria-label={'هەڵبژاردەکانی ' + c.title}
                            data-placement={menuPos?.placement}
                            style={menuPos ? { top: menuPos.y, left: menuPos.x } : { visibility: 'hidden' }}
                            onKeyDown={onMenuKeyDown}
                          >
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
                                closeMenu(true)
                              }}
                            >
                              <Icon name="bookmark" size={15} />
                              {c.pinned ? 'لابردنی پین' : 'پینکردن'}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => startRename(c)}
                            >
                              <Icon name="pen" size={15} />
                              ناونانەوە
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="danger"
                              onClick={() => askDelete(c)}
                            >
                              <Icon name="trash" size={15} />
                              سڕینەوە
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
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