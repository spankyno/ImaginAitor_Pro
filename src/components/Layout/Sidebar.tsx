import { useRef } from 'react'
import { Crop, Maximize2, RotateCw, SlidersHorizontal, Sparkles, Type, Shapes, ScanEye, Layers } from 'lucide-react'
import { useUiStore, type ToolId } from '../../store/useUiStore'
import { CropPanel } from '../Panels/CropPanel'
import { ResizePanel } from '../Panels/ResizePanel'
import { TransformPanel } from '../Panels/TransformPanel'
import { AdjustPanel } from '../Panels/AdjustPanel'
import { FiltersPanel } from '../Panels/FiltersPanel'
import { TextPanel } from '../Panels/TextPanel'
import { ShapesPanel } from '../Panels/ShapesPanel'
import { PixelatePanel } from '../Panels/PixelatePanel'
import { HistoryPanel } from '../Panels/HistoryPanel'

const TABS: { id: ToolId; label: string; icon: typeof Crop }[] = [
  { id: 'crop', label: 'Recortar', icon: Crop },
  { id: 'resize', label: 'Tamaño', icon: Maximize2 },
  { id: 'transform', label: 'Girar', icon: RotateCw },
  { id: 'adjust', label: 'Ajustes', icon: SlidersHorizontal },
  { id: 'filters', label: 'Filtros', icon: Sparkles },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'shapes', label: 'Formas', icon: Shapes },
  { id: 'pixelate', label: 'Ocultar', icon: ScanEye },
  { id: 'history', label: 'Capas', icon: Layers },
]

export function Sidebar({ docId }: { docId: string }) {
  const tab = useUiStore((s) => s.activeTool)
  const setTab = useUiStore((s) => s.setActiveTool)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    if (e.key === 'Home') nextIndex = 0
    if (e.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex !== null) {
      e.preventDefault()
      const nextTab = TABS[nextIndex]
      setTab(nextTab.id)
      btnRefs.current[nextTab.id]?.focus()
    }
  }

  return (
    <div className="flex h-full">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Herramientas de edición"
        className="flex w-16 flex-col items-center gap-1 border-r border-border-subtle bg-bg-panel py-3"
      >
        {TABS.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            ref={(el) => { btnRefs.current[id] = el }}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => setTab(id)}
            title={label}
            className={`flex w-12 flex-col items-center gap-1 rounded-lg py-2 text-[10px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${tab === id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-panel-2'}`}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="w-72 overflow-y-auto bg-bg-panel px-3 py-4 focus-visible:outline-none"
      >
        {tab === 'crop' && <CropPanel docId={docId} />}
        {tab === 'resize' && <ResizePanel docId={docId} />}
        {tab === 'transform' && <TransformPanel docId={docId} />}
        {tab === 'adjust' && <AdjustPanel docId={docId} />}
        {tab === 'filters' && <FiltersPanel docId={docId} />}
        {tab === 'text' && <TextPanel docId={docId} />}
        {tab === 'shapes' && <ShapesPanel docId={docId} />}
        {tab === 'pixelate' && <PixelatePanel docId={docId} />}
        {tab === 'history' && <HistoryPanel docId={docId} />}
      </div>
    </div>
  )
}
