import { useEditorStore } from '../../store/useEditorStore'
import { createResizeOp } from '../../lib/opFactory'
import { resizeTarget, sizeBeforeOp } from '../../lib/geometry'
import type { ResizeOp } from '../../types/pipeline'
import { Slider } from './Slider'

const MIN_PX = 16
const MAX_PX = 8000
const clampPx = (n: number) => Math.min(MAX_PX, Math.max(MIN_PX, Math.round(n)))

export function ResizePanel({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)
  const removeOp = useEditorStore((s) => s.removeOp)

  const existing = doc?.ops.find((o) => o.type === 'resize') as ResizeOp | undefined

  const ensureOp = (): ResizeOp => {
    if (existing) return existing
    const op = createResizeOp()
    addOp(docId, op)
    return op
  }

  const set = (patch: Partial<ResizeOp['params']>) => {
    const op = ensureOp()
    updateOp(docId, op.id, patch)
  }

  // Size of the image as it reaches this step (after crop/rotate/etc.).
  const before = doc ? sizeBeforeOp(doc.source, doc.ops, existing?.id ?? null) : { width: 1, height: 1 }
  const ratio = before.width / before.height
  const params = existing?.params ?? createResizeOp().params
  const mode = params.mode
  const out = resizeTarget(before.width, before.height, params)

  const setMode = (m: ResizeOp['params']['mode']) => {
    // Start "Píxeles" from the real current size instead of a hard-coded 1920×1080.
    if (m === 'exact') set({ mode: m, width: clampPx(before.width), height: clampPx(before.height) })
    else set({ mode: m })
  }

  const setWidth = (w: number) =>
    params.keepAspect ? set({ width: w, height: clampPx(w / ratio) }) : set({ width: w })
  const setHeight = (h: number) =>
    params.keepAspect ? set({ height: h, width: clampPx(h * ratio) }) : set({ height: h })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {(['fit', 'exact', 'percent'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-2 py-2 text-xs transition-colors ${mode === m ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-muted hover:text-text-primary'}`}
          >
            {m === 'fit' ? 'Encajar en' : m === 'exact' ? 'Píxeles' : 'Porcentaje'}
          </button>
        ))}
      </div>

      {mode === 'fit' && (
        <Slider label="Lado máximo" unit="px" min={64} max={MAX_PX} value={params.maxSide} onChange={(v) => set({ maxSide: v })} />
      )}
      {mode === 'exact' && (
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Ancho" unit="px" min={MIN_PX} max={MAX_PX} value={out.width} onChange={setWidth} />
          <Slider label="Alto" unit="px" min={MIN_PX} max={MAX_PX} value={out.height} onChange={setHeight} />
        </div>
      )}
      {mode === 'percent' && (
        <Slider label="Porcentaje" unit="%" min={1} max={200} value={params.percent} onChange={(v) => set({ percent: v })} />
      )}

      <p className="rounded-lg bg-bg-panel-2 px-3 py-2 text-xs text-text-muted" aria-live="polite">
        {before.width} × {before.height} px → <span className="text-text-primary tabular-nums">{out.width} × {out.height} px</span>
      </p>

      <label className="flex items-center gap-2 text-xs text-text-muted">
        <input
          type="checkbox"
          checked={params.keepAspect}
          onChange={(e) => set(e.target.checked ? { keepAspect: true, height: clampPx(params.width / ratio) } : { keepAspect: false })}
        />
        Mantener proporción
      </label>

      <label className="flex items-center gap-2 text-xs text-text-muted">
        <input type="checkbox" checked={params.quality === 'high'} onChange={(e) => set({ quality: e.target.checked ? 'high' : 'fast' })} />
        Calidad máxima (downscale progresivo)
      </label>

      {existing && (
        <button onClick={() => removeOp(docId, existing.id)} className="text-xs text-text-muted hover:text-red-400 self-start">
          Quitar redimensionado
        </button>
      )}
    </div>
  )
}
