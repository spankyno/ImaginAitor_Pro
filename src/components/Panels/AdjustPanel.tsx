import { useEditorStore } from '../../store/useEditorStore'
import { createAdjustOp } from '../../lib/opFactory'
import type { AdjustOp } from '../../types/pipeline'
import { Slider } from './Slider'

const FIELDS: { key: keyof AdjustOp['params']; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: 'Brillo', min: -100, max: 100 },
  { key: 'contrast', label: 'Contraste', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturación', min: -100, max: 100 },
  { key: 'exposure', label: 'Exposición', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperatura', min: -100, max: 100 },
  { key: 'sharpness', label: 'Nitidez', min: 0, max: 100 },
  { key: 'blur', label: 'Desenfoque', min: 0, max: 20 },
]

export function AdjustPanel({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)

  const existing = doc?.ops.find((o) => o.type === 'adjust') as AdjustOp | undefined

  const ensureOp = (): AdjustOp => {
    if (existing) return existing
    const op = createAdjustOp()
    addOp(docId, op)
    return op
  }

  const set = (key: keyof AdjustOp['params'], value: number) => {
    const op = ensureOp()
    updateOp(docId, op.id, { [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map((f) => (
        <Slider
          key={f.key}
          label={f.label}
          min={f.min}
          max={f.max}
          value={(existing?.params[f.key] as number) ?? 0}
          onChange={(v) => set(f.key, v)}
        />
      ))}
    </div>
  )
}
