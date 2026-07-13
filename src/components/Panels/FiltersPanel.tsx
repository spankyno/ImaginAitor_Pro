import { useEditorStore } from '../../store/useEditorStore'
import { createFilterOp } from '../../lib/opFactory'
import type { FilterOp, FilterPreset } from '../../types/pipeline'
import { Slider } from './Slider'

const PRESETS: { id: FilterPreset; label: string }[] = [
  { id: 'none', label: 'Original' },
  { id: 'bw', label: 'B&N' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'cool', label: 'Frío' },
  { id: 'warm', label: 'Cálido' },
  { id: 'fade', label: 'Fade' },
  { id: 'vivid', label: 'Vívido' },
  { id: 'noir', label: 'Noir' },
]

export function FiltersPanel({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)
  const removeOp = useEditorStore((s) => s.removeOp)

  const existing = doc?.ops.find((o) => o.type === 'filter') as FilterOp | undefined

  const choose = (preset: FilterPreset) => {
    if (preset === 'none') {
      if (existing) removeOp(docId, existing.id)
      return
    }
    if (existing) {
      updateOp(docId, existing.id, { preset, intensity: existing.params.intensity })
    } else {
      addOp(docId, createFilterOp(preset))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
              (existing?.params.preset ?? 'none') === p.id
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-subtle text-text-muted hover:text-text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {existing && (
        <Slider
          label="Intensidad"
          min={0}
          max={100}
          value={existing.params.intensity}
          onChange={(v) => updateOp(docId, existing.id, { intensity: v })}
        />
      )}
    </div>
  )
}
