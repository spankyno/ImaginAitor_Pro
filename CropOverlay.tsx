import { useEditorStore } from '../../../store/useEditorStore'
import { createCropOp } from '../../../lib/opFactory'
import type { CropOp } from '../../../types/pipeline'
import { DraggableRect, type NormRect } from './DraggableRect'

export function CropOverlay({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)

  const existing = doc?.ops.find((o) => o.type === 'crop') as CropOp | undefined
  const rect: NormRect = existing
    ? { x: existing.params.x, y: existing.params.y, width: existing.params.width, height: existing.params.height }
    : { x: 0, y: 0, width: 1, height: 1 }

  const ensureOp = (): CropOp => {
    if (existing) return existing
    const op = createCropOp()
    addOp(docId, op)
    return op
  }

  // Live-update while dragging (debounced re-render happens inside the
  // store), commit is just the final value — both go through the same path
  // here since crop is cheap to preview.
  const handleChange = (r: NormRect) => {
    const op = ensureOp()
    updateOp(docId, op.id, { x: r.x, y: r.y, width: r.width, height: r.height })
  }

  return (
    <DraggableRect
      rect={rect}
      onChange={handleChange}
      label={`${Math.round(rect.width * 100)}% × ${Math.round(rect.height * 100)}%`}
    />
  )
}
