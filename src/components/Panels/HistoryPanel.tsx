import { useState } from 'react'
import {
  Eye, EyeOff, GripVertical, Trash2, Undo2, Redo2,
  Crop, Maximize2, RotateCw, FlipHorizontal, SlidersHorizontal,
  Sparkles, Type, Shapes, ScanEye,
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import type { EditOperation, OpType } from '../../types/pipeline'

const OP_ICONS: Record<OpType, typeof Crop> = {
  crop: Crop,
  resize: Maximize2,
  rotate: RotateCw,
  flip: FlipHorizontal,
  adjust: SlidersHorizontal,
  filter: Sparkles,
  text: Type,
  shape: Shapes,
  pixelate: ScanEye,
}

function OpIcon({ type }: { type: EditOperation['type'] }) {
  const Icon = OP_ICONS[type] ?? SlidersHorizontal
  return <Icon size={14} aria-hidden="true" className="text-accent shrink-0" />
}

export function HistoryPanel({ docId }: { docId: string }) {
  const ds = useEditorStore((s) => s.docs[docId])
  const toggleOp = useEditorStore((s) => s.toggleOp)
  const removeOp = useEditorStore((s) => s.removeOp)
  const reorderOps = useEditorStore((s) => s.reorderOps)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  if (!ds) return null
  const ops = ds.doc.ops

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Historial</span>
        <div className="flex gap-1">
          <button disabled={ds.past.length === 0} onClick={() => undo(docId)} aria-label="Deshacer" className="rounded p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <Undo2 size={14} />
          </button>
          <button disabled={ds.future.length === 0} onClick={() => redo(docId)} aria-label="Rehacer" className="rounded p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {ops.length === 0 && <p className="px-2 py-4 text-xs text-text-muted">Aún no hay ediciones. Cada acción aparecerá aquí como un paso independiente.</p>}
        {ops.map((op, i) => (
          <div
            key={op.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIndex !== null && dragIndex !== i) reorderOps(docId, dragIndex, i); setDragIndex(null) }}
            className={`mb-1.5 flex items-center gap-2 rounded-lg border px-2 py-2 text-xs transition-colors ${op.enabled ? 'border-border-subtle bg-bg-panel-2' : 'border-border-subtle/50 bg-bg-panel-2/40 opacity-50'}`}
          >
            <GripVertical size={13} className="cursor-grab text-text-muted shrink-0" aria-hidden="true" />
            <OpIcon type={op.type} />
            <span className="flex-1 truncate text-text-primary">{op.label}</span>
            <button
              onClick={() => toggleOp(docId, op.id)}
              aria-label={op.enabled ? `Ocultar paso: ${op.label}` : `Mostrar paso: ${op.label}`}
              aria-pressed={op.enabled}
              className="text-text-muted hover:text-text-primary shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
            >
              {op.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={() => removeOp(docId, op.id)}
              aria-label={`Eliminar paso: ${op.label}`}
              className="text-text-muted hover:text-red-400 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
