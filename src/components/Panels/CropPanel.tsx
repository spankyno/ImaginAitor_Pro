import { useEditorStore } from '../../store/useEditorStore'
import { createCropOp } from '../../lib/opFactory'
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

export function CropPanel({ docId }: { docId: string }) {
  const ds = useEditorStore((s) => s.docs[docId])
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)
  const doc = ds?.doc

  const existing = doc?.ops.find((o) => o.type === 'crop') as CropOp | undefined

  const ensureOp = (): CropOp => {
    if (existing) return existing
    const op = createCropOp()
    addOp(docId, op)
    return op
  }

  const applyPreset = (ratio: number | null) => {
    const op = ensureOp()
    if (ratio === null) {
      updateOp(docId, op.id, { x: 0, y: 0, width: 1, height: 1 })
      return
    }
    const srcW = doc!.source.width, srcH = doc!.source.height
    const srcRatio = srcW / srcH
    let w: number, h: number
    if (ratio > srcRatio) { w = 1; h = (srcW / ratio) / srcH } else { h = 1; w = (srcH * ratio) / srcW }
    updateOp(docId, op.id, { x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h })
  }

  const set = (key: keyof CropOp['params'], value: number) => {
    const op = ensureOp()
    updateOp(docId, op.id, { [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p.ratio)} className="rounded-lg border border-border-subtle px-2 py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary transition-colors">
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Slider label="X" min={0} max={0.9} step={0.01} value={existing?.params.x ?? 0} onChange={(v) => set('x', v)} />
        <Slider label="Y" min={0} max={0.9} step={0.01} value={existing?.params.y ?? 0} onChange={(v) => set('y', v)} />
        <Slider label="Ancho" min={0.1} max={1} step={0.01} value={existing?.params.width ?? 1} onChange={(v) => set('width', v)} />
        <Slider label="Alto" min={0.1} max={1} step={0.01} value={existing?.params.height ?? 1} onChange={(v) => set('height', v)} />
      </div>
      <Slider label="Rotación del recorte" min={-45} max={45} value={existing?.params.rotation ?? 0} onChange={(v) => set('rotation', v)} />
      <p className="text-xs text-text-muted leading-relaxed">
        Ajusta X/Y/Ancho/Alto para definir la región (valores 0–1 relativos a la imagen). El arrastre interactivo de esquinas sobre el lienzo es el siguiente paso natural de esta UI.
      </p>
    </div>
  )
}
