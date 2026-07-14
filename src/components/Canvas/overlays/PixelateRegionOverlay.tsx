import { useEditorStore } from '../../../store/useEditorStore'
import { createPixelateOp } from '../../../lib/opFactory'
import type { PixelateOp } from '../../../types/pipeline'
import { DraggableRect, type NormRect } from './DraggableRect'

export function PixelateRegionOverlay({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)

  const ops = doc?.ops.filter((o) => o.type === 'pixelate') as PixelateOp[] | undefined
  const last = ops?.[ops.length - 1]

  if (!last) {
    // Nothing to drag yet — click-drag directly on the canvas to create the first zone.
    return (
      <CreateOnDrag
        onCreate={(r) => addOp(docId, createPixelateOp({ x: r.x, y: r.y, width: r.width, height: r.height }))}
      />
    )
  }

  const rect: NormRect = { x: last.params.x, y: last.params.y, width: last.params.width, height: last.params.height }
  return (
    <DraggableRect
      rect={rect}
      onChange={(r) => updateOp(docId, last.id, { x: r.x, y: r.y, width: r.width, height: r.height })}
      label={last.params.mode === 'pixelate' ? 'Pixelado' : 'Difuminado'}
    />
  )
}

/**
 * Empty-state helper: lets the user click-drag anywhere on the canvas to
 * define the first region, instead of only being able to nudge sliders.
 * Once created, control hands off to <DraggableRect>.
 */
function CreateOnDrag({ onCreate }: { onCreate: (r: NormRect) => void }) {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const startX = (e.clientX - box.left) / box.width
    const startY = (e.clientY - box.top) / box.height
    ;(e.target as Element).setPointerCapture(e.pointerId)

    let current: NormRect = { x: startX, y: startY, width: 0, height: 0 }
    const el = e.currentTarget

    const onMove = (ev: PointerEvent) => {
      const nx = (ev.clientX - box.left) / box.width
      const ny = (ev.clientY - box.top) / box.height
      const x = Math.min(startX, nx), y = Math.min(startY, ny)
      const width = Math.abs(nx - startX), height = Math.abs(ny - startY)
      current = { x, y, width, height }
      el.style.setProperty('--sx', `${x * 100}%`)
      el.style.setProperty('--sy', `${y * 100}%`)
      el.style.setProperty('--sw', `${width * 100}%`)
      el.style.setProperty('--sh', `${height * 100}%`)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (current.width > 0.02 && current.height > 0.02) onCreate(current)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div onPointerDown={handlePointerDown} className="absolute inset-0 cursor-crosshair">
      <div
        className="pointer-events-none absolute border-2 border-dashed border-accent bg-accent/10"
        style={{ left: 'var(--sx, 0)', top: 'var(--sy, 0)', width: 'var(--sw, 0)', height: 'var(--sh, 0)' }}
      />
      <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-[11px] text-white">
        Arrastra para definir la zona
      </span>
    </div>
  )
}
