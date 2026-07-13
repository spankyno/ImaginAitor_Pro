import { useEffect, useRef, useState } from 'react'
import { X, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore } from '../../store/useEditorStore'
import { getRenderWorker } from '../../lib/workerClient'
import { classifyError } from '../../lib/errors'
import type { ExportSettings } from '../../types/pipeline'

const STORAGE_KEY = 'imaginaitor:lastExport'

function loadLastSettings(): Partial<ExportSettings> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ExportDialog({ docId, onClose }: { docId: string; onClose: () => void }) {
  const ds = useEditorStore((s) => s.docs[docId])
  const last = loadLastSettings()
  const [format, setFormat] = useState<ExportSettings['format']>(last.format ?? 'png')
  const [quality, setQuality] = useState(last.quality ?? 0.92)
  const [fileName, setFileName] = useState(ds?.doc.source.name.replace(/\.[^.]+$/, '') || 'imagen')
  const [scale, setScale] = useState(1)
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ format, quality }))
  }, [format, quality])

  useEffect(() => {
    if (!ds) return
    const myGeneration = ++generationRef.current
    setBusy(true)
    setError(null)
    // Debounced: dragging the quality/scale sliders shouldn't fire a full
    // re-encode on every intermediate value.
    const timer = setTimeout(() => {
      getRenderWorker()
        .exportBlob(ds.doc.source.bitmap, ds.doc.ops, format, quality, scale)
        .then((blob) => {
          if (generationRef.current !== myGeneration) return // a newer request superseded this one
          setExportedBlob(blob)
          setBusy(false)
        })
        .catch((e) => {
          if (generationRef.current !== myGeneration) return
          const classified = classifyError(e)
          setError(classified.description)
          setBusy(false)
          toast.error(classified.title, { description: classified.description })
        })
    }, 150)
    return () => clearTimeout(timer)
  }, [ds, format, quality, scale])

  const closeBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { closeBtnRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!ds) return null

  const download = () => {
    if (!exportedBlob) return
    const ext = format === 'jpeg' ? 'jpg' : format
    const a = document.createElement('a')
    a.href = URL.createObjectURL(exportedBlob)
    a.download = `${fileName || 'imagen'}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Imagen exportada')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] rounded-2xl border border-border-subtle bg-bg-panel p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="export-dialog-title" className="text-sm font-semibold">Exportar imagen</h2>
          <button ref={closeBtnRef} onClick={onClose} aria-label="Cerrar diálogo de exportación" className="text-text-muted hover:text-text-primary rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Nombre de archivo</label>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">Formato</label>
            <div className="grid grid-cols-4 gap-2">
              {(['png', 'jpeg', 'webp', 'avif'] as const).map((f) => (
                <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border py-1.5 text-xs uppercase transition-colors ${format === f ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-muted'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {format !== 'png' && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-text-muted">
                <span>Calidad</span><span>{Math.round(quality * 100)}%</span>
              </div>
              <input type="range" min={0.1} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
            </div>
          )}

          <div>
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>Escala de exportación</span><span>{Math.round(scale * 100)}%</span>
            </div>
            <input type="range" min={0.1} max={2} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-bg-panel-2 px-3 py-2.5 text-xs">
            <span className="text-text-muted">Original: {formatBytes(ds.doc.source.originalSize)}</span>
            <span className="text-text-primary font-medium" aria-live="polite">
              {busy ? 'calculando…' : error ? 'error' : exportedBlob ? `Exportado: ${formatBytes(exportedBlob.size)}` : '—'}
            </span>
          </div>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          <button onClick={download} disabled={!exportedBlob || busy} className="flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <Download size={16} /> Descargar
          </button>
        </div>
      </div>
    </div>
  )
}
