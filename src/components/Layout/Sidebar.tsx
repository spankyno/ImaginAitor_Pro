import { useState } from 'react'
import { Crop, Maximize2, RotateCw, SlidersHorizontal, Sparkles, Type, Shapes, ScanEye, Layers } from 'lucide-react'
import { CropPanel } from '../Panels/CropPanel'
import { ResizePanel } from '../Panels/ResizePanel'
import { TransformPanel } from '../Panels/TransformPanel'
import { AdjustPanel } from '../Panels/AdjustPanel'
import { FiltersPanel } from '../Panels/FiltersPanel'
import { TextPanel } from '../Panels/TextPanel'
import { ShapesPanel } from '../Panels/ShapesPanel'
import { PixelatePanel } from '../Panels/PixelatePanel'
import { HistoryPanel } from '../Panels/HistoryPanel'

const TABS = [
  { id: 'crop', label: 'Recortar', icon: Crop },
  { id: 'resize', label: 'Tamaño', icon: Maximize2 },
  { id: 'transform', label: 'Girar', icon: RotateCw },
  { id: 'adjust', label: 'Ajustes', icon: SlidersHorizontal },
  { id: 'filters', label: 'Filtros', icon: Sparkles },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'shapes', label: 'Formas', icon: Shapes },
  { id: 'pixelate', label: 'Ocultar', icon: ScanEye },
  { id: 'history', label: 'Capas', icon: Layers },
] as const

type TabId = typeof TABS[number]['id']

export function Sidebar({ docId }: { docId: string }) {
  const [tab, setTab] = useState<TabId>('crop')

  return (
    <div className="flex h-full">
      <div className="flex w-16 flex-col items-center gap-1 border-r border-border-subtle bg-bg-panel py-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            title={label}
            className={`flex w-12 flex-col items-center gap-1 rounded-lg py-2 text-[10px] transition-colors ${tab === id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-panel-2'}`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div className="w-72 overflow-y-auto bg-bg-panel px-3 py-4">
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
