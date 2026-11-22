import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useToast } from './Toast.jsx'
import { useSpeech } from '../hooks/useSpeech.js'
import { IS_LIVE } from '../api.js'
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  TEXT_FILE_TYPES,
  VOICE_LANG,
} from '../data.js'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('فایل نەخوێندرایەوە.'))
    reader.readAsDataURL(file)
  })
}

async function compressImage(file) {
  const image = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('وێنەکە پەستاندرایەوە.')),
      'image/jpeg',
      0.78,
    )
  })
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error('دوای پەستاندنیش وێنەکە زۆر گەورەیە.')
  }
  return { dataUrl: await readAsDataUrl(blob), size: blob.size }
}

async function readPdfText(file) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  if (pdf.numPages > 40) throw new Error('PDF زیاتر لە ٤٠ لاپەڕەیە.')

  const pages = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items.map((item) => item.str || '').join(' ').trim()
    if (text) pages.push(`لاپەڕە ${pageNumber}:\n${text}`)
  }
  if (pages.length === 0) {
    throw new Error('لە PDF ـەکەدا دەقی خوێندراوە نەدۆزرایەوە؛ PDF ـەکە لەوانەیە وێنەی سکەنکراو بێت.')
  }
  return pages.join('\n\n')
}

const SPEECH_ERRORS = {
  unsupported: 'ئەم براوزەرە پشتگیری نووسینی دەنگ ناکات. Chrome یان Edge بەکاربهێنە.',
  'not-allowed': 'ڕێگەپێدانی مایکرۆفۆن نەدراوە. لە ڕێکخستنی براوزەر چالاکی بکە.',
  'service-not-allowed': 'ڕێگەپێدانی مایکرۆفۆن نەدراوە.',
  'language-not-supported': 'زمانی دەنگ پشتگیری ناکرێت. لە src/data.js بیگۆڕە بۆ ar-IQ یان en-US.',
  'no-speech': 'هیچ دەنگێک نەبیسترا. دووبارە هەوڵبدەرەوە.',
  'audio-capture': 'مایکرۆفۆن نەدۆزرایەوە.',
  network: 'بۆ نووسینی دەنگ پێویستت بە ئینتەرنێتە.',
}

export default function Composer({
  onSend,
  busy,
  onStop,
  focusTick,
}) {
  const notify = useToast()
  const [value, setValue] = useState('')
  const [files, setFiles] = useState([])
  const [drag, setDrag] = useState(false)
  const ref = useRef(null)
  const fileRef = useRef(null)
  const baseRef = useRef('')

  useEffect(() => {
    if (focusTick > 0) ref.current?.focus()
  }, [focusTick])

  // بەرزی تێکستەکە بە پێی ناوەڕۆک
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [value])

  const onSpeechText = useCallback((txt) => setValue((baseRef.current + ' ' + txt).trim()), [])
  const onSpeechError = useCallback(
    (code) => {
      if (code === 'aborted') return
      notify(SPEECH_ERRORS[code] || 'کێشەیەک لە نووسینی دەنگ ڕوویدا (' + code + ')')
    },
    [notify],
  )
  const { listening, start, stop } = useSpeech(VOICE_LANG, { onText: onSpeechText, onError: onSpeechError })

  const toggleMic = () => {
    if (listening) {
      stop()
    } else {
      baseRef.current = value
      start()
    }
  }

  const addFiles = async (list) => {
    const next = [...files]
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        notify('زیاتر لە ' + MAX_FILES + ' فایل ناتوانرێت هاوپێچ بکرێت.')
        break
      }
      try {
        if (f.type.startsWith('image/')) {
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
            notify('تەنها وێنەی JPG، PNG یان WebP پشتگیری دەکرێت.')
            continue
          }
          if (f.size > MAX_IMAGE_BYTES) {
            notify('«' + f.name + '» وێنەیەکی زۆر گەورەیە (زۆرینە ٨ MB).')
            continue
          }
          const compressed = await compressImage(f)
          next.push({
            name: f.name,
            size: compressed.size,
            type: 'image/jpeg',
            dataUrl: compressed.dataUrl,
          })
          continue
        }

        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
          if (f.size > MAX_PDF_BYTES) {
            notify('«' + f.name + '» زۆر گەورەیە (زۆرینە ١٠ MB).')
            continue
          }
          next.push({
            name: f.name,
            size: f.size,
            type: 'application/pdf',
            text: await readPdfText(f),
          })
          continue
        }

        if (f.size > MAX_FILE_BYTES) {
          notify('«' + f.name + '» گەورەیە. زۆرینە ١٠٠ KB ڕێگەپێدراوە.')
          continue
        }
        const text = await f.text()
        if (text.includes('\u0000')) {
          notify('«' + f.name + '» فایلی دەق نییە.')
          continue
        }
        next.push({ name: f.name, size: f.size, type: f.type || 'text/plain', text })
      } catch (error) {
        console.error('[Attachment Read Error]', f.name, error)
        notify(error?.message || 'نەتوانرا «' + f.name + '» بخوێنرێتەوە.')
      }
    }
    setFiles(next)
  }

  const canSend = value.trim().length > 0 || files.length > 0

  const submit = () => {
    if (busy || !canSend) return
    if (listening) stop()
    onSend(value, files)
    setValue('')
    setFiles([])
  }

  return (
    <div className="dock">
      <form
        className={'composer' + (drag ? ' drag' : '')}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
        }}
      >
        {files.length > 0 && (
          <div className="chips in">
            {files.map((f, i) => (
              <span className="chip" key={f.name + i}>
                <Icon name="file" size={14} />
                <span className="chip-name" dir="ltr">{f.name}</span>
                <button
                  type="button"
                  aria-label={'لابردنی ' + f.name}
                  onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                >
                  <Icon name="close" size={12} strokeWidth={2.4} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="row">
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept={TEXT_FILE_TYPES}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button className="icon-btn flat" type="button" aria-label="هاوپێچکردنی فایلی دەق" onClick={() => fileRef.current?.click()}>
            <Icon name="clip" />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            placeholder="هەر شتێک بنووسە..."
            aria-label="پەیامەکەت"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
          />
          <button
            className={'icon-btn flat' + (listening ? ' rec' : '')}
            type="button"
            aria-label={listening ? 'وەستاندنی دەنگ' : 'نووسین بە دەنگ'}
            aria-pressed={listening}
            onClick={toggleMic}
          >
            <Icon name="mic" />
          </button>
          {busy ? (
            <button className="send stop" type="button" aria-label="وەستان" onClick={onStop}>
              <Icon name="stop" size={18} />
            </button>
          ) : (
            <button className="send" type="submit" aria-label="ناردن" disabled={!canSend}>
              <Icon name="up" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </form>

      <p className="note">
        {IS_LIVE
          ? 'ڕەنگە KURDZHIR AI هەڵە بکات. زانیارییە گرنگەکان بپشکنە.'
          : 'دەمۆی ڕووکارە: وەڵامەکان نموونەن و هێشتا بە AI نەبەستراوەتەوە.'}
      </p>
    </div>
  )
}
