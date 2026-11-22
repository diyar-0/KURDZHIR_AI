import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

const STYLES = [
  { value: 'balanced', label: 'هاوسەنگ' },
  { value: 'friendly', label: 'دۆستانە' },
  { value: 'formal', label: 'فەرمی' },
  { value: 'creative', label: 'داهێنەرانە' },
]

const LENGTHS = [
  { value: 'short', label: 'کورت' },
  { value: 'medium', label: 'مامناوەند' },
  { value: 'long', label: 'ورد' },
]

export default function AISettings({
  settings,
  models,
  providers,
  onChange,
  open,
  onOpenChange,
}) {
  const settingsRef = useRef(null)
  const selectedProvider = providers.find((provider) => provider.id === settings.provider)
    || providers[0]
  const providerModels = selectedProvider?.models || models

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event) => {
      if (!settingsRef.current?.contains(event.target)) onOpenChange(false)
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

  return (
    <div className="ai-settings" ref={settingsRef}>
      <button
        className="icon-btn"
        type="button"
        aria-label="ڕێکخستنی AI"
        aria-expanded={open}
        aria-controls="ai-settings-panel"
        onClick={() => onOpenChange(!open)}
      >
        <Icon name="sliders" size={18} />
      </button>
      {open && (
        <section className="settings-panel" id="ai-settings-panel" aria-label="ڕێکخستنی AI">
          <div className="settings-head">
            <h2>ڕێکخستنی AI</h2>
            <button
              className="icon-btn flat"
              type="button"
              aria-label="داخستن"
              onClick={() => onOpenChange(false)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <label>
            دابینکەر
            <select
              value={selectedProvider?.id || ''}
              onChange={(event) => {
                const provider = providers.find((item) => item.id === event.target.value)
                if (!provider) return
                onChange({
                  ...settings,
                  provider: provider.id,
                  model: provider.models.includes(settings.model)
                    ? settings.model
                    : provider.defaultModel || provider.models[0],
                })
              }}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
          </label>
          <label>
            مۆدێل
            <select
              value={settings.model}
              onChange={(event) => onChange({ ...settings, model: event.target.value })}
            >
              {providerModels.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          <label>
            شێوازی وەڵام
            <select
              value={settings.style}
              onChange={(event) => onChange({ ...settings, style: event.target.value })}
            >
              {STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
            </select>
          </label>
          <label>
            درێژی وەڵام
            <select
              value={settings.length}
              onChange={(event) => onChange({ ...settings, length: event.target.value })}
            >
              {LENGTHS.map((length) => <option key={length.value} value={length.value}>{length.label}</option>)}
            </select>
          </label>
          <p>ئەم ڕێکخستنانە بۆ گفتوگۆی داهاتوو بەکاردێن.</p>
        </section>
      )}
    </div>
  )
}
