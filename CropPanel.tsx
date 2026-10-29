import { useState } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { createCropOp } from '../../lib/opFactory'
import { cropBaseSize, cropOutputSize, sizeBeforeOp } from '../../lib/geometry'
import type { CropOp } from '../../types/pipeline'
import { Slider } from './Slider'

const PRESETS: { label: string; ratio: number | null }[] = [
  { label: 'Libre', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '5:4', ratio: 5 / 4 },
]

type Unit = 'px' | '%'

export function CropPanel({ docId }: { docId: string }) {
  const ds = useEditorStore((s) => s.docs[docId])
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)
  const removeOp = useEditorStore((s) => s.removeOp)
  const doc = ds?.doc
  const [unit, setUnit] = useState<Unit>('px')

  const existing = doc?.ops.find((o) => o.type === 'crop') as CropOp | undefined

  const ensureOp = (): CropOp => {
    if (existing) return existing
    const op = createCropOp()
    addOp(docId, op)
    return op
  }

  const p = existing?.params ?? { x: 0, y: 0, width: 1, height: 1, rotation: 0 }

  // Pixel dimensions the crop rectangle is measured against (image as it
  // arrives at this step, enlarged if the crop itself is rotated).
  const before = doc ? sizeBeforeOp(doc.source, doc.ops, existing?.id ?? null) : { width: 1, height: 1 }
  const base = cropBaseSize(before, p.rotation)
  const out = cropOutputSize(before, p)

  const applyPreset = (ratio: number | null) => {
    const op = ensureOp()
    if (ratio === null) {
      updateOp(docId, op.id, { x: 0, y: 0, width: 1, height: 1 })
      return
    }
    const srcW = base.width, srcH = base.height
    const srcRatio = srcW / srcH
    let w: number, h: number
    if (ratio > srcRatio) { w = 1; h = (srcW / ratio) / srcH } else { h = 1; w = (srcH * ratio) / srcW }
    updateOp(docId, op.id, { x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h })
  }

  const set = (key: keyof CropOp['params'], value: number) => {
    const op = ensureOp()
    updateOp(docId, op.id, { [key]: value })
  }

  // Field geometry: stored values are always 0..1; only the display changes.
  const px = unit === 'px'
  const sx = px ? base.width : 100
  const sy = px ? base.height : 100
  const dec = px ? 0 : 1
  const u = px ? 'px' : '%'
  const minW = px ? 1 / base.width : 0.01
  const minH = px ? 1 / base.height : 0.01
  const stepX = px ? 1 / base.width : 0.01
  const stepY = px ? 1 / base.height : 0.01

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((pr) => (
          <button key={pr.label} onClick={() => applyPreset(pr.ratio)} className="rounded-lg border border-border-subtle px-2 py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary transition-colors">
            {pr.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Unidades de los valores</span>
        <div className="flex gap-1" role="group" aria-label="Unidades del recorte">
          {(['px', '%'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setUnit(opt)}
              aria-pressed={unit === opt}
              className={`rounded px-2 py-1 text-xs ${unit === opt ? 'bg-accent text-white' : 'bg-bg-panel-2 text-text-muted hover:text-text-primary'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Slider label="X" min={0} max={Math.max(0, 1 - p.width)} step={stepX} scale={sx} decimals={dec} unit={u} value={p.x} onChange={(v) => set('x', v)} />
        <Slider label="Y" min={0} max={Math.max(0, 1 - p.height)} step={stepY} scale={sy} decimals={dec} unit={u} value={p.y} onChange={(v) => set('y', v)} />
        <Slider label="Ancho" min={minW} max={Math.max(minW, 1 - p.x)} step={stepX} scale={sx} decimals={dec} unit={u} value={p.width} onChange={(v) => set('width', v)} />
        <Slider label="Alto" min={minH} max={Math.max(minH, 1 - p.y)} step={stepY} scale={sy} decimals={dec} unit={u} value={p.height} onChange={(v) => set('height', v)} />
      </div>
      <Slider label="Rotación del recorte" min={-45} max={45} step={0.5} decimals={1} unit="°" value={p.rotation} onChange={(v) => set('rotation', v)} />

      <p className="rounded-lg bg-bg-panel-2 px-3 py-2 text-xs text-text-muted" aria-live="polite">
        Resultado del recorte: <span className="text-text-primary tabular-nums">{out.width} × {out.height} px</span>
      </p>

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted leading-relaxed">
          Arrastra las asas sobre el lienzo o escribe los valores, y pulsa <strong className="text-text-primary">"Aplicar recorte"</strong> (arriba del lienzo, o Enter) para ver el resultado recortado.
        </p>
      </div>
      {existing && (
        <button
          onClick={() => removeOp(docId, existing.id)}
          className="self-start text-xs text-text-muted hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
        >
          Restablecer recorte (volver al encuadre completo)
        </button>
      )}
    </div>
  )
}
