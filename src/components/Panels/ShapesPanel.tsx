import { Square, Circle, ArrowUpRight, Highlighter } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { createShapeOp } from '../../lib/opFactory'
import type { ShapeKind } from '../../types/pipeline'
import { Slider } from './Slider'

const KINDS: { id: ShapeKind; label: string; icon: typeof Square }[] = [
  { id: 'rectangle', label: 'Rectángulo', icon: Square },
  { id: 'ellipse', label: 'Círculo', icon: Circle },
  { id: 'arrow', label: 'Flecha', icon: ArrowUpRight },
  { id: 'marker', label: 'Marcador', icon: Highlighter },
]

export function ShapesPanel({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)

  const shapeOps = doc?.ops.filter((o) => o.type === 'shape') ?? []
  const last = shapeOps[shapeOps.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        {KINDS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => addOp(docId, createShapeOp(id))} title={label} className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle py-2 text-[10px] text-text-muted hover:border-accent/60 hover:text-text-primary">
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {last && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3">
          <div className="flex items-center gap-2">
            <input type="color" value={last.params.color} onChange={(e) => updateOp(docId, last.id, { color: e.target.value })} className="h-8 w-10 rounded" />
            <label className="flex items-center gap-1 text-xs text-text-muted">
              <input type="checkbox" checked={last.params.fill} onChange={(e) => updateOp(docId, last.id, { fill: e.target.checked })} /> Relleno
            </label>
          </div>
          <Slider label="Grosor" min={1} max={40} value={last.params.strokeWidth} onChange={(v) => updateOp(docId, last.id, { strokeWidth: v })} />
          <Slider label="Rotación" min={-180} max={180} value={last.params.rotation} onChange={(v) => updateOp(docId, last.id, { rotation: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="X" min={0} max={1} step={0.01} value={last.params.x} onChange={(v) => updateOp(docId, last.id, { x: v })} />
            <Slider label="Y" min={0} max={1} step={0.01} value={last.params.y} onChange={(v) => updateOp(docId, last.id, { y: v })} />
            <Slider label="Ancho" min={0.02} max={1} step={0.01} value={last.params.width} onChange={(v) => updateOp(docId, last.id, { width: v })} />
            <Slider label="Alto" min={0.02} max={1} step={0.01} value={last.params.height} onChange={(v) => updateOp(docId, last.id, { height: v })} />
          </div>
        </div>
      )}
    </div>
  )
}
