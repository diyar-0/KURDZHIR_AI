import Icon from './Icon.jsx'
import Sun from './Sun.jsx'
import Markdown from './Markdown.jsx'
import { useTypewriter } from '../hooks/useTypewriter.js'

function formatSize(n) {
  return n < 1024 ? n + ' B' : Math.round(n / 1024) + ' KB'
}

export function UserMessage({ msg, onCopy }) {
  return (
    <div className="msg user">
      <div className="user-message-content">
        <div className="bubble">
          {msg.files?.filter((file) => file.dataUrl).map((file) => (
            <a
              className="attachment-image"
              href={file.dataUrl}
              target="_blank"
              rel="noreferrer"
              key={file.name}
              aria-label={'بینینی وێنە: ' + file.name}
            >
              <img src={file.dataUrl} alt={file.name} />
            </a>
          ))}
          {msg.files?.length > 0 && (
            <div className="chips">
              {msg.files.map((f, i) => (
                <span className="chip" key={f.name + i}>
                  <Icon name={f.type === 'application/pdf' ? 'file' : f.dataUrl ? 'image' : 'file'} size={14} />
                  <span className="chip-name" dir="ltr">{f.name}</span>
                  <small>{formatSize(f.size)}</small>
                </span>
              ))}
            </div>
          )}
          <div className="utext">{msg.text}</div>
        </div>
        <div className="actions user-actions">
          <button type="button" onClick={onCopy} aria-label="کۆپی" title="کۆپی">
            <Icon name="copy" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Body({ text, typing, onTick, onDone }) {
  const { shown, typing: still } = useTypewriter(text, typing, { onTick, onDone })
  return (
    <div>
      <Markdown text={shown} />
      {still && <span className="caret" />}
    </div>
  )
}

export function AIMessage({ msg, isLast, typing, streaming, busy, onTick, onTyped, onCopy, onLike, onRetry }) {
  const showActions = !typing && !streaming && !msg.error
  return (
    <div className="msg ai">
      <Sun size={30} state={typing || streaming ? 'typing' : 'idle'} className="mini" />
      <div className="body">
        {msg.error ? (
          <p className="err">{msg.text}</p>
        ) : streaming ? (
          <div>
            <Markdown text={msg.text} />
            <span className="caret" />
          </div>
        ) : (
          <Body text={msg.text} typing={typing} onTick={onTick} onDone={onTyped} />
        )}
        {(showActions || (msg.error && isLast && !busy)) && (
          <div className="actions">
            {showActions && (
              <>
                <button type="button" onClick={onCopy} aria-label="کۆپی" title="کۆپی">
                  <Icon name="copy" size={16} />
                </button>
                <button
                  type="button"
                  className={msg.liked ? 'on' : ''}
                  onClick={onLike}
                  aria-label="باشبوو"
                  aria-pressed={!!msg.liked}
                  title="باشبوو"
                >
                  <Icon name="like" size={16} />
                </button>
              </>
            )}
            {isLast && !busy && (
              <button type="button" onClick={onRetry} aria-label="دووبارە" title="دووبارە">
                <Icon name="retry" size={16} />
                {msg.error && <span>دووبارە هەوڵبدەرەوە</span>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ThinkingMessage() {
  return (
    <div className="msg ai">
      <Sun size={30} state="thinking" className="mini" />
      <div className="body">
        <div className="dots" aria-label="خەریکی بیرکردنەوەم">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  )
}
