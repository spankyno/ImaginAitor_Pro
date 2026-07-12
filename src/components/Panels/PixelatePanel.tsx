import { useEditorStore } from '../../store/useEditorStore'
import { createPixelateOp } from '../../lib/opFactory'
import { Slider } from './Slider'

export function PixelatePanel({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)

  const ops = doc?.ops.filter((o) => o.type === 'pixelate') ?? []
  const last = ops[ops.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">Oculta datos sensibles en capturas: matrículas, emails, nombres...</p>
      <button onClick={() => addOp(docId, createPixelateOp())} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover">
        + Añadir zona a ocultar
      </button>

      {last && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3">
          <div className="flex gap-2">
            {(['pixelate', 'blur'] as const).map((m) => (
              <button key={m} onClick={() => updateOp(docId, last.id, { mode: m })} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${last.params.mode === m ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-muted'}`}>
                {m === 'pixelate' ? 'Pixelar' : 'Difuminar'}
              </button>
            ))}
          </div>
          <Slider label="Intensidad" min={2} max={40} value={last.params.strength} onChange={(v) => updateOp(docId, last.id, { strength: v })} />
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
