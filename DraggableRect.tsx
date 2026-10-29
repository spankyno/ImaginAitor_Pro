import { useRef, useState } from 'react'

export interface NormRect { x: number; y: number; width: number; height: number }

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: { id: HandleId; cursor: string; x: number; y: number }[] = [
  { id: 'nw', cursor: 'nwse-resize', x: 0, y: 0 },
  { id: 'n', cursor: 'ns-resize', x: 0.5, y: 0 },
  { id: 'ne', cursor: 'nesw-resize', x: 1, y: 0 },
  { id: 'e', cursor: 'ew-resize', x: 1, y: 0.5 },
  { id: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
  { id: 's', cursor: 'ns-resize', x: 0.5, y: 1 },
  { id: 'sw', cursor: 'nesw-resize', x: 0, y: 1 },
  { id: 'w', cursor: 'ew-resize', x: 0, y: 0.5 },
]

const MIN_SIZE = 0.02

/**
 * A single draggable + 8-handle-resizable rectangle, rendered directly over
 * the fitted image box. Coordinates are normalized 0..1 relative to the
 * overlay's own bounding box, so this works unchanged at any zoom/pan level
 * — getBoundingClientRect() already accounts for the ancestor CSS transform.
 */
export function DraggableRect({
  rect, onChange, onCommit, label, accent = true,
}: {
  rect: NormRect
  onChange: (r: NormRect) => void
  onCommit?: (r: NormRect) => void
  label?: string
  accent?: boolean
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ mode: 'move' | HandleId; startX: number; startY: number; startRect: NormRect } | null>(null)

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

  const startDrag = (e: React.PointerEvent, mode: 'move' | HandleId) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDrag({ mode, startX: e.clientX, startY: e.clientY, startRect: rect })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const box = overlayRef.current?.getBoundingClientRect()
    if (!box) return
    const dx = (e.clientX - drag.startX) / box.width
    const dy = (e.clientY - drag.startY) / box.height
    let { x, y, width, height } = drag.startRect

    if (drag.mode === 'move') {
      x = clamp01(drag.startRect.x + dx)
      y = clamp01(drag.startRect.y + dy)
      x = Math.min(x, 1 - width)
      y = Math.min(y, 1 - height)
    } else {
      const h = drag.mode
      let x2 = drag.startRect.x + drag.startRect.width
      let y2 = drag.startRect.y + drag.startRect.height
      let x1 = drag.startRect.x
      let y1 = drag.startRect.y
      if (h.includes('e')) x2 = clamp01(drag.startRect.x + drag.startRect.width + dx)
      if (h.includes('w')) x1 = clamp01(drag.startRect.x + dx)
      if (h.includes('s')) y2 = clamp01(drag.startRect.y + drag.startRect.height + dy)
      if (h.includes('n')) y1 = clamp01(drag.startRect.y + dy)
      if (x2 - x1 < MIN_SIZE) { if (h.includes('w')) x1 = x2 - MIN_SIZE; else x2 = x1 + MIN_SIZE }
      if (y2 - y1 < MIN_SIZE) { if (h.includes('n')) y1 = y2 - MIN_SIZE; else y2 = y1 + MIN_SIZE }
      x = x1; y = y1; width = x2 - x1; height = y2 - y1
    }
    onChange({ x, y, width, height })
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return
    setDrag(null)
    onCommit?.(rect)
    void e
  }

  const px = (n: number) => `${n * 100}%`

  return (
    <div ref={overlayRef} className="absolute inset-0" onPointerMove={onPointerMove} onPointerUp={endDrag}>
      {/* dim the area outside the rect */}
      <div className="absolute inset-0 bg-black/40" style={{ clipPath: buildOutsideClipPath(rect) }} />
      <div
        onPointerDown={(e) => startDrag(e, 'move')}
        className={`absolute cursor-move border-2 ${accent ? 'border-accent' : 'border-white'}`}
        style={{ left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height), boxShadow: '0 0 0 9999px transparent' }}
      >
        {label && (
          <span className="absolute -top-6 left-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">{label}</span>
        )}
        {/* rule-of-thirds grid */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/20" />)}
        </div>
        {HANDLES.map((h) => (
          <div
            key={h.id}
            onPointerDown={(e) => startDrag(e, h.id)}
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white shadow"
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, cursor: h.cursor }}
          />
        ))}
      </div>
    </div>
  )
}

function buildOutsideClipPath(rect: NormRect) {
  const x1 = rect.x * 100, y1 = rect.y * 100
  const x2 = (rect.x + rect.width) * 100, y2 = (rect.y + rect.height) * 100
  // even-odd rectangle-with-hole clip path
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${x1}% ${y1}%, ${x1}% ${y2}%, ${x2}% ${y2}%, ${x2}% ${y1}%, ${x1}% ${y1}%)`
}
