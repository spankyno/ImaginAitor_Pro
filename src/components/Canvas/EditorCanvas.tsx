import { useCallback, useEffect, useRef, useState, Suspense, lazy } from 'react'
import { Loader2, SplitSquareHorizontal, ZoomIn, ZoomOut, Maximize, Scan } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useUiStore } from '../../store/useUiStore'
import { useFitSize } from '../../hooks/useFitSize'
import { useOriginalPreviewUrl } from '../../hooks/useOriginalPreviewUrl'
import { useBaseLayerPreview } from '../../hooks/useBaseLayerPreview'
import { CropOverlay } from './overlays/CropOverlay'
import { PixelateRegionOverlay } from './overlays/PixelateRegionOverlay'

const KonvaLayerEditor = lazy(() => import('./overlays/KonvaLayerEditor').then((m) => ({ default: m.KonvaLayerEditor })))

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

export function EditorCanvas() {
  const activeId = useEditorStore((s) => s.activeId)
  const ds = useEditorStore((s) => (s.activeId ? s.docs[s.activeId] : undefined))
  const activeTool = useUiStore((s) => s.activeTool)
  const [compareMode, setCompareMode] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const isCropTool = activeTool === 'crop'
  const isPixelateTool = activeTool === 'pixelate'
  const isLayerTool = activeTool === 'text' || activeTool === 'shapes'

  const originalUrl = useOriginalPreviewUrl(ds?.doc, compareMode || isCropTool)
  const basePreview = useBaseLayerPreview(ds?.doc, isLayerTool)

  // Pick which image + natural dimensions are on screen right now.
  let displayUrl: string | null = ds?.previewUrl ?? null
  let naturalW = ds?.previewWidth ?? 1
  let naturalH = ds?.previewHeight ?? 1
  if (!compareMode && isCropTool && originalUrl && ds) {
    displayUrl = originalUrl
    naturalW = ds.doc.source.width
    naturalH = ds.doc.source.height
  } else if (!compareMode && isLayerTool && basePreview) {
    displayUrl = basePreview.url
    naturalW = basePreview.width
    naturalH = basePreview.height
  }

  const fitSize = useFitSize(viewportRef, naturalW, naturalH, 16)

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [activeId])

  const fitToViewport = useCallback((mode: 'width' | 'screen' | '100') => {
    const el = viewportRef.current
    if (!el || !ds) return
    if (mode === '100') { setZoom(1); setPan({ x: 0, y: 0 }); return }
    const rect = el.getBoundingClientRect()
    const scaleW = rect.width / fitSize.width
    const scaleH = rect.height / fitSize.height
    const next = mode === 'width' ? scaleW : Math.min(scaleW, scaleH)
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)))
    setPan({ x: 0, y: 0 })
  }, [ds, fitSize])

  const onWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return
    e.preventDefault()
    const rect = viewportRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const factor = Math.exp(-e.deltaY * 0.0015)
    setZoom((z) => {
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor))
      setPan((p) => ({ x: cx - (cx - p.x) * (nz / z), y: cy - (cy - p.y) * (nz / z) }))
      return nz
    })
  }

  if (!activeId || !ds) {
    return <div className="flex h-full items-center justify-center text-text-muted">Selecciona o sube una imagen para empezar</div>
  }

  const showOverlay = !compareMode && (isCropTool || isPixelateTool || isLayerTool)

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
          ref={boxRef}
          className="relative"
          style={{ width: fitSize.width, height: fitSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {!compareMode && displayUrl && (
            <img src={displayUrl} alt="" width={fitSize.width} height={fitSize.height} className="absolute inset-0 h-full w-full select-none pointer-events-none" draggable={false} />
          )}

          {showOverlay && isCropTool && <CropOverlay docId={activeId} />}
          {showOverlay && isPixelateTool && <PixelateRegionOverlay docId={activeId} />}
          {showOverlay && isLayerTool && (
            <div className="absolute inset-0">
              <Suspense fallback={null}>
                <KonvaLayerEditor docId={activeId} width={fitSize.width} height={fitSize.height} />
              </Suspense>
            </div>
          )}

          {compareMode && ds.previewUrl && originalUrl && (
            <div
              className="relative h-full w-full select-none"
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                setSliderPos(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)))
              }}
            >
              <img src={ds.previewUrl} alt="" className="h-full w-full object-contain pointer-events-none" draggable={false} />
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={originalUrl} alt="" className="h-full w-full object-contain pointer-events-none" draggable={false} />
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
