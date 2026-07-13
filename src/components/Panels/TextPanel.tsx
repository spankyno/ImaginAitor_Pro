import { useEditorStore } from '../../store/useEditorStore'
import { createTextOp } from '../../lib/opFactory'
import { Slider } from './Slider'

const FONTS = ['Inter, sans-serif', 'Georgia, serif', '"Courier New", monospace', '"Segoe UI", sans-serif']

export function TextPanel({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const addOp = useEditorStore((s) => s.addOp)
  const updateOp = useEditorStore((s) => s.updateOp)

  const textOps = doc?.ops.filter((o) => o.type === 'text') ?? []
  const last = textOps[textOps.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => addOp(docId, createTextOp())}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        + Añadir texto
      </button>

      {last && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3">
          <input
            value={last.params.text}
            onChange={(e) => updateOp(docId, last.id, { text: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-panel-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
          <select
            value={last.params.fontFamily}
            onChange={(e) => updateOp(docId, last.id, { fontFamily: e.target.value })}
            className="rounded-md border border-border-subtle bg-bg-panel-2 px-2 py-1.5 text-sm outline-none"
          >
            {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="color" value={last.params.color} onChange={(e) => updateOp(docId, last.id, { color: e.target.value })} className="h-8 w-10 rounded" />
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} onClick={() => updateOp(docId, last.id, { align: a })} className={`rounded px-2 py-1 text-xs ${last.params.align === a ? 'bg-accent text-white' : 'bg-bg-panel-2 text-text-muted'}`}>{a[0].toUpperCase()}</button>
              ))}
            </div>
          </div>
          <Slider label="Tamaño" min={8} max={200} value={last.params.fontSize} onChange={(v) => updateOp(docId, last.id, { fontSize: v })} />
          <Slider label="Rotación" min={-180} max={180} value={last.params.rotation} onChange={(v) => updateOp(docId, last.id, { rotation: v })} />
          <Slider label="Posición X" min={0} max={1} step={0.01} value={last.params.x} onChange={(v) => updateOp(docId, last.id, { x: v })} />
          <Slider label="Posición Y" min={0} max={1} step={0.01} value={last.params.y} onChange={(v) => updateOp(docId, last.id, { y: v })} />
          <div className="flex gap-3 text-xs text-text-muted">
            <label className="flex items-center gap-1"><input type="checkbox" checked={last.params.bold} onChange={(e) => updateOp(docId, last.id, { bold: e.target.checked })} /> Negrita</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={last.params.italic} onChange={(e) => updateOp(docId, last.id, { italic: e.target.checked })} /> Cursiva</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={last.params.shadow} onChange={(e) => updateOp(docId, last.id, { shadow: e.target.checked })} /> Sombra</label>
          </div>
        </div>
      )}
    </div>
  )
}
