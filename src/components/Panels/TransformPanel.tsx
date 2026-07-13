import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { createRotateOp, createFlipOp } from '../../lib/opFactory'

export function TransformPanel({ docId }: { docId: string }) {
  const addOp = useEditorStore((s) => s.addOp)

  const rotate = (deg: number) => addOp(docId, createRotateOp(deg))
  const flip = (h: boolean, v: boolean) => addOp(docId, createFlipOp(h, v))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs text-text-muted">Rotar</p>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => rotate(-90)} className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary">
            <RotateCcw size={16} /> -90°
          </button>
          <button onClick={() => rotate(90)} className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary">
            <RotateCw size={16} /> 90°
          </button>
          <button onClick={() => rotate(180)} className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary">
            180°
          </button>
          <button onClick={() => rotate(270)} className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary">
            270°
          </button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs text-text-muted">Voltear</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => flip(true, false)} className="flex items-center justify-center gap-2 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary">
            <FlipHorizontal size={16} /> Horizontal
          </button>
          <button onClick={() => flip(false, true)} className="flex items-center justify-center gap-2 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary">
            <FlipVertical size={16} /> Vertical
          </button>
        </div>
      </div>
    </div>
  )
}
