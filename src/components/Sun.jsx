// ڕۆژی ٢١ تیشکی، هێمای ئاڵای کوردستان. بارەکەی AI نیشان دەدات: idle | thinking | typing

const RAYS = Array.from({ length: 21 }, (_, i) => (i * 360) / 21)

export default function Sun({ size = 28, state = 'idle', className = '' }) {
  return (
    <span className={'sun ' + className} data-state={state} style={{ '--s': size + 'px' }} aria-hidden="true">
      <svg viewBox="-50 -50 100 100">
        {RAYS.map((a) => (
          <polygon key={a} points="-3.7,-27 3.7,-27 0,-48" transform={`rotate(${a})`} />
        ))}
        <circle r="21" />
      </svg>
    </span>
  )
}
