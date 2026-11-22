import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useToast } from './Toast.jsx'
import { NAME } from '../data.js'

const SYNC_LABELS = {
  local: 'چاتەکان لەم ئامێرە خەزن دەکرێن',
  loading: 'چاتەکان بار دەکرێن...',
  synced: 'چاتەکان sync کراون',
  error: 'کێشە لە sync ـی چاتەکان',
}

export default function AccountPanel({
  user,
  loading,
  configured,
  syncStatus,
  open,
  onOpenChange,
  trigger,
  onSignIn,
  onSignOut,
  onExport,
  onImport,
  onDeleteAccount,
  deletableChatCount,
  onDeleteChats,
}) {
  const inputRef = useRef(null)
  const accountRef = useRef(null)
  const [confirmDeleteChats, setConfirmDeleteChats] = useState(false)
  const notify = useToast()

  useEffect(() => {
    if (!open) {
      setConfirmDeleteChats(false)
      return
    }

    const closeOnOutsideClick = (event) => {
      if (!accountRef.current?.contains(event.target)) onOpenChange(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange])

  const importBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('فایلی پشتگیری نابێت لە ٢٠ MB گەورەتر بێت.')
      }
      const backup = JSON.parse(await file.text())
      await onImport(backup)
      onOpenChange(false)
      notify('پشتگیریی چاتەکان هاوردە کرا.')
    } catch (error) {
      console.error('[Chat Backup Import Error]', error)
      notify(error?.message || 'فایلی پشتگیری دروست نییە.')
    }
  }

  const removeAccount = async () => {
    if (!window.confirm('هەژمار و هەموو چاتەکانی ئەم هەژمارە بە هەمیشەیی بسڕدرێنەوە؟ ئەم کارە ناگەڕێتەوە.')) {
      return
    }

    try {
      await onDeleteAccount()
      onOpenChange(false)
      notify('هەژمارەکەت سڕایەوە.')
    } catch (error) {
      console.error('[Delete Account Request Error]', error)
      notify(error?.message || 'سڕینەوەی هەژمار سەرکەوتوو نەبوو.')
    }
  }

  return (
    <div className="account side-account" ref={accountRef}>
      <button
        className={trigger ? 'me account-toggle account-trigger' : 'icon-btn account-toggle'}
        type="button"
        aria-label={user ? 'هەژمار' : 'چوونەژوورەوە'}
        aria-expanded={open}
        aria-controls="account-panel"
        onClick={() => onOpenChange(!open)}
      >
        {trigger || <Icon name="user" size={18} />}
      </button>

      <section
        className={'account-panel' + (open ? ' open' : '')}
        id="account-panel"
        aria-label="هەژمار و داتا"
        aria-hidden={!open}
      >
        <div className="account-profile">
          <span className="avatar">{(user?.email || NAME).charAt(0).toUpperCase()}</span>
          <div className="account-profile-text">
            <b dir="auto">{user?.email || NAME}</b>
            <small>{user
              ? SYNC_LABELS[syncStatus] || SYNC_LABELS.local
              : 'هەژماری کەسی'}</small>
          </div>
        </div>
        <div className="account-divider" />
        {user ? (
          <>
            <button type="button" className="account-action" onClick={onExport}>
              <Icon name="download" size={16} />
              هەناردەکردنی پشتگیری
            </button>
            <button type="button" className="account-action" onClick={() => inputRef.current?.click()}>
              <Icon name="upload" size={16} />
              هاوردەکردنی پشتگیری
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={importBackup}
            />
            <div className="account-divider" />
            <button type="button" className="account-action danger" onClick={removeAccount}>
              هەژمارەکەش بسڕەوە
            </button>
            <button type="button" className="account-action" onClick={onSignOut}>
              چوونەدەرەوە
            </button>
          </>
        ) : (
          <>
            <button type="button" className="account-action" onClick={onExport}>
              <Icon name="download" size={16} />
              هەناردەکردنی پشتگیری
            </button>
            <button type="button" className="account-action" onClick={() => inputRef.current?.click()}>
              <Icon name="upload" size={16} />
              هاوردەکردنی پشتگیری
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={importBackup}
            />
            <p>{configured
              ? 'چاتەکان لە ئامێرەکانت sync بکە.'
              : 'چاتەکان لەم براوزەرە خەزن دەکرێن. بۆ Gmail sign-in، Supabase ڕێکبخە.'}</p>
            <div className="account-divider" />
            <button
              type="button"
              className="account-action primary"
              disabled={!configured || loading}
              onClick={async () => {
                try {
                  await onSignIn()
                } catch (error) {
                  console.error('[Google Sign-In Error]', error)
                  notify(error?.message || 'چوونەژوورەوە بە Google سەرکەوتوو نەبوو.')
                }
              }}
            >
              <span className="google-mark" aria-hidden="true">G</span>
              {loading ? 'چاوەڕێ بکە...' : 'چوونەژوورەوە بە Gmail'}
            </button>
          </>
        )}
        <div className="account-divider" />
        {confirmDeleteChats ? (
          <div className="account-delete-confirm" role="group" aria-labelledby="delete-chats-title">
            <b id="delete-chats-title">دڵنیایت لە سڕینەوە؟</b>
            <p>
              {deletableChatCount} چاتی ناپینکراو دەسڕدرێتەوە. چاتە پینکراوەکان دەمێننەوە.
            </p>
            <div className="account-delete-actions">
              <button
                type="button"
                className="account-delete-cancel"
                onClick={() => setConfirmDeleteChats(false)}
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                className="account-delete-confirm-button"
                onClick={() => {
                  setConfirmDeleteChats(false)
                  onDeleteChats()
                  onOpenChange(false)
                }}
              >
                <Icon name="trash" size={15} />
                بەڵێ، بیسڕەوە
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="account-action danger"
            disabled={deletableChatCount === 0}
            aria-label={`سڕینەوەی ${deletableChatCount} چاتی ناپینکراو`}
            onClick={() => setConfirmDeleteChats(true)}
          >
            <Icon name="trash" size={16} />
           سڕینەوەی چاتەکان  ({deletableChatCount})
          </button>
        )}
      </section>
    </div>
  )
}
