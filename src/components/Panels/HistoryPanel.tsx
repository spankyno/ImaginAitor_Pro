import { useState } from 'react'
import { Eye, EyeOff, GripVertical, Trash2, Undo2, Redo2 } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

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
          <button disabled={ds.past.length === 0} onClick={() => undo(docId)} className="rounded p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30">
            <Undo2 size={14} />
          </button>
          <button disabled={ds.future.length === 0} onClick={() => redo(docId)} className="rounded p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30">
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
            <GripVertical size={13} className="cursor-grab text-text-muted shrink-0" />
            <span className="flex-1 truncate text-text-primary">{op.label}</span>
            <button onClick={() => toggleOp(docId, op.id)} className="text-text-muted hover:text-text-primary shrink-0">
              {op.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button onClick={() => removeOp(docId, op.id)} className="text-text-muted hover:text-red-400 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
