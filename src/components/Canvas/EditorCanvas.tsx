import { useMemo, useState } from 'react'
import { Loader2, SplitSquareHorizontal } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

export function EditorCanvas() {
  const activeId = useEditorStore((s) => s.activeId)
  const ds = useEditorStore((s) => (s.activeId ? s.docs[s.activeId] : undefined))
  const [compareMode, setCompareMode] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)

  const originalUrl = useMemo(() => {
    if (!ds) return null
    const canvas = document.createElement('canvas')
    canvas.width = ds.doc.source.width
    canvas.height = ds.doc.source.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(ds.doc.source.bitmap, 0, 0)
    return canvas.toDataURL('image/png')
  }, [ds?.doc.source.id])

  if (!activeId || !ds) {
    return <div className="flex h-full items-center justify-center text-text-muted">Selecciona o sube una imagen para empezar</div>
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-sm text-text-muted truncate max-w-[50%]">{ds.doc.source.name}</div>
        <div className="flex items-center gap-3">
          {ds.isRendering && <Loader2 size={14} className="animate-spin text-accent" />}
          <button
            onClick={() => setCompareMode((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${compareMode ? 'border-accent text-accent bg-accent/10' : 'border-border-subtle text-text-muted hover:text-text-primary'}`}
          >
            <SplitSquareHorizontal size={14} /> Comparar
          </button>
        </div>
      </div>

      <div className="checkerboard relative flex flex-1 items-center justify-center overflow-hidden rounded-xl mx-4 mb-4">
        {!compareMode && ds.previewUrl && (
          <img src={ds.previewUrl} alt="preview" className="max-h-full max-w-full object-contain select-none" draggable={false} />
        )}
        {compareMode && ds.previewUrl && originalUrl && (
          <div
            className="relative h-full w-full flex items-center justify-center select-none"
            onMouseMove={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              setSliderPos(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)))
            }}
          >
            <img src={ds.previewUrl} alt="después" className="max-h-full max-w-full object-contain pointer-events-none" draggable={false} />
            <div className="absolute inset-0 overflow-hidden flex items-center justify-center" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
              <img src={originalUrl} alt="antes" className="max-h-full max-w-full object-contain pointer-events-none" draggable={false} />
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
  )
}
