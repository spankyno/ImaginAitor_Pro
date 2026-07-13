import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, SplitSquareHorizontal, ZoomIn, ZoomOut, Maximize, Scan } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

export function EditorCanvas() {
  const activeId = useEditorStore((s) => s.activeId)
  const ds = useEditorStore((s) => (s.activeId ? s.docs[s.activeId] : undefined))
  const [compareMode, setCompareMode] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  // Build a small blob-URL preview of the pristine original for compare
  // mode, instead of a giant base64 data URL — same reasoning as the main
  // preview pipeline: cheaper to create, cheaper to hold in memory, and we
  // revoke it as soon as it's no longer needed.
  useEffect(() => {
    if (!ds || !compareMode) return
    let cancelled = false
    let url: string | null = null
    const canvas = document.createElement('canvas')
    canvas.width = ds.doc.source.width
    canvas.height = ds.doc.source.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(ds.doc.source.bitmap, 0, 0)
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return
      url = URL.createObjectURL(blob)
      setOriginalUrl(url)
    }, 'image/png')
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [ds?.doc.source.id, compareMode])

  // Reset the viewport whenever the active image changes.
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [activeId])

  const fitToViewport = useCallback((mode: 'width' | 'screen' | '100') => {
    const el = viewportRef.current
    if (!el || !ds) return
    const rect = el.getBoundingClientRect()
    if (mode === '100') { setZoom(1); setPan({ x: 0, y: 0 }); return }
    const scaleW = rect.width / ds.previewWidth
    const scaleH = rect.height / ds.previewHeight
    const next = mode === 'width' ? scaleW : Math.min(scaleW, scaleH)
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)))
    setPan({ x: 0, y: 0 })
  }, [ds])

  const onWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return
    e.preventDefault()
    const rect = viewportRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const factor = Math.exp(-e.deltaY * 0.0015)
    setZoom((z) => {
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor))
      // Keep the point under the cursor fixed while zooming (zoom-to-cursor).
      setPan((p) => ({
        x: cx - (cx - p.x) * (nz / z),
        y: cy - (cy - p.y) * (nz / z),
      }))
      return nz
    })
  }

  if (!activeId || !ds) {
    return <div className="flex h-full items-center justify-center text-text-muted">Selecciona o sube una imagen para empezar</div>
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-sm text-text-muted truncate max-w-[40%]">{ds.doc.source.name}</div>
        <div className="flex items-center gap-2">
          {ds.isRendering && <Loader2 size={14} className="animate-spin text-accent" aria-label="Renderizando" />}

          <div className="flex items-center gap-0.5 rounded-lg border border-border-subtle p-0.5" role="group" aria-label="Controles de zoom">
            <button aria-label="Alejar" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))} className="rounded p-1.5 text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <ZoomOut size={14} />
            </button>
            <span className="w-11 text-center text-xs tabular-nums text-text-muted">{Math.round(zoom * 100)}%</span>
            <button aria-label="Acercar" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))} className="rounded p-1.5 text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <ZoomIn size={14} />
            </button>
            <span className="mx-1 h-4 w-px bg-border-subtle" />
            <button aria-label="Ajustar al ancho" title="Ajustar al ancho" onClick={() => fitToViewport('width')} className="rounded p-1.5 text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <Scan size={14} />
            </button>
            <button aria-label="Ajustar a la pantalla" title="Ajustar a la pantalla" onClick={() => fitToViewport('screen')} className="rounded p-1.5 text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              <Maximize size={14} />
            </button>
            <button aria-label="Tamaño real 100%" title="100%" onClick={() => fitToViewport('100')} className="rounded px-1.5 py-1 text-[10px] font-medium text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              1:1
            </button>
          </div>

          <button
            onClick={() => setCompareMode((v) => !v)}
            aria-pressed={compareMode}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${compareMode ? 'border-accent text-accent bg-accent/10' : 'border-border-subtle text-text-muted hover:text-text-primary'}`}
          >
            <SplitSquareHorizontal size={14} /> Comparar
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        onWheel={onWheel}
        className="checkerboard relative flex flex-1 items-center justify-center overflow-hidden rounded-xl mx-4 mb-4"
        role="img"
        aria-label={`Vista previa de ${ds.doc.source.name}, zoom ${Math.round(zoom * 100)} por ciento. Usa la rueda del ratón para hacer zoom.`}
        tabIndex={0}
      >
        <div
          className="flex items-center justify-center transition-transform duration-75 ease-out"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {!compareMode && ds.previewUrl && (
            <img src={ds.previewUrl} alt="" className="max-h-[75vh] max-w-full object-contain select-none pointer-events-none" draggable={false} />
          )}
          {compareMode && ds.previewUrl && originalUrl && (
            <div
              className="relative select-none"
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                setSliderPos(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)))
              }}
            >
              <img src={ds.previewUrl} alt="" className="max-h-[75vh] max-w-full object-contain pointer-events-none" draggable={false} />
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={originalUrl} alt="" className="max-h-[75vh] max-w-full object-contain pointer-events-none" draggable={false} />
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-accent" style={{ left: `${sliderPos}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white shadow-lg">
                  <SplitSquareHorizontal size={14} />
                </div>
              </div>
              <span className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-[11px] text-white">Antes</span>
              <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-[11px] text-white">Después</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
