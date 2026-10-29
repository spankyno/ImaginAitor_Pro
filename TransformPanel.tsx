import { useState } from 'react'
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { createRotateOp, createFlipOp } from '../../lib/opFactory'
import { rotatedSize, sizeBeforeOp } from '../../lib/geometry'
import { NumberField } from './NumberField'

export function TransformPanel({ docId }: { docId: string }) {
  const addOp = useEditorStore((s) => s.addOp)
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const [angle, setAngle] = useState(15)

  const current = doc ? sizeBeforeOp(doc.source, doc.ops, null) : { width: 1, height: 1 }
  const next = rotatedSize(current.width, current.height, angle)
  const isNoop = angle % 360 === 0

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
      <div className="flex flex-col gap-2">
        <p className="text-xs text-text-muted">Giro libre (grados, positivo = sentido horario)</p>
        <div className="flex items-center gap-2">
          <NumberField label="Ángulo de giro en grados" value={angle} onChange={setAngle} min={-360} max={360} step={0.5} decimals={1} unit="°" />
          <button
            onClick={() => rotate(angle)}
            disabled={isNoop}
            className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Aplicar giro
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-text-muted" aria-live="polite">
          Tamaño tras girar: <span className="text-text-primary tabular-nums">{next.width} × {next.height} px</span>. Los ángulos que no son múltiplos de 90° dejan esquinas transparentes.
        </p>
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
