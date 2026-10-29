import { useState } from 'react'
import { Download, Layers3, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore } from '../../store/useEditorStore'
import { Dropzone } from '../Upload/Dropzone'
import { ExportDialog } from '../Export/ExportDialog'
import { Filmstrip } from './Filmstrip'

export function TopBar() {
  const order = useEditorStore((s) => s.order)
  const activeId = useEditorStore((s) => s.activeId)
  const applyPipelineToAll = useEditorStore((s) => s.applyPipelineToAll)
  const [exportOpen, setExportOpen] = useState(false)

  const runBatch = async () => {
    if (!activeId) return
    toast.promise(applyPipelineToAll(activeId), {
      loading: 'Aplicando pipeline a todas las imágenes…',
      success: 'Lote aplicado a todas las imágenes',
      error: 'Error aplicando el lote',
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border-subtle bg-bg-panel px-4 py-2.5">
        <div className="flex items-center gap-2 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Sparkles size={15} />
          </div>
          <span className="text-sm font-semibold tracking-tight">ImaginAitor_Pro</span>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-hidden py-1">
          <div className="min-w-0 flex-1">
            <Filmstrip ids={order} />
          </div>
          <Dropzone compact />
        </div>

        {order.length > 1 && (
          <button onClick={runBatch} className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <Layers3 size={14} /> Aplicar a todas
          </button>
        )}

        <button
          disabled={!activeId}
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Download size={15} /> Exportar
        </button>
      </div>

      {exportOpen && activeId && <ExportDialog docId={activeId} onClose={() => setExportOpen(false)} />}
    </>
  )
}
