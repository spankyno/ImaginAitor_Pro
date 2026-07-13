import { useEditorStore } from '../../store/useEditorStore'
import { createResizeOp } from '../../lib/opFactory'
import type { ResizeOp } from '../../types/pipeline'
import { Slider } from './Slider'

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

  const mode = existing?.params.mode ?? 'fit'

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {(['fit', 'exact', 'percent'] as const).map((m) => (
          <button
            key={m}
            onClick={() => set({ mode: m })}
            className={`rounded-lg border px-2 py-2 text-xs transition-colors ${mode === m ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-muted hover:text-text-primary'}`}
          >
            {m === 'fit' ? 'Encajar en' : m === 'exact' ? 'Píxeles' : 'Porcentaje'}
          </button>
        ))}
      </div>

      {mode === 'fit' && (
        <Slider label="Lado máximo (px)" min={64} max={8000} value={existing?.params.maxSide ?? 2048} onChange={(v) => set({ maxSide: v })} />
      )}
      {mode === 'exact' && (
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Ancho (px)" min={16} max={8000} value={existing?.params.width ?? 1920} onChange={(v) => set({ width: v })} />
          <Slider label="Alto (px)" min={16} max={8000} value={existing?.params.height ?? 1080} onChange={(v) => set({ height: v })} />
        </div>
      )}
      {mode === 'percent' && (
        <Slider label="Porcentaje" min={1} max={200} value={existing?.params.percent ?? 100} onChange={(v) => set({ percent: v })} />
      )}

      <label className="flex items-center gap-2 text-xs text-text-muted">
        <input type="checkbox" checked={existing?.params.keepAspect ?? true} onChange={(e) => set({ keepAspect: e.target.checked })} />
        Mantener proporción
      </label>

      <label className="flex items-center gap-2 text-xs text-text-muted">
        <input type="checkbox" checked={(existing?.params.quality ?? 'high') === 'high'} onChange={(e) => set({ quality: e.target.checked ? 'high' : 'fast' })} />
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
