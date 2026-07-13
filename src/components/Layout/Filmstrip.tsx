import { Grid, type CellComponentProps } from 'react-window'
import { X } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

const CELL_WIDTH = 64
const STRIP_HEIGHT = 56

interface CellProps {
  ids: string[]
}

/**
 * Virtualized horizontal filmstrip. With 300+ loaded images we only ever
 * mount the handful of thumbnail <img> elements actually visible in the
 * scroll viewport (+ a small overscan buffer) instead of all 300 at once.
 */
function ThumbCell({ columnIndex, style, ids }: CellComponentProps<CellProps>) {
  const id = ids[columnIndex]
  const previewUrl = useEditorStore((s) => s.docs[id]?.previewUrl)
  const name = useEditorStore((s) => s.docs[id]?.doc.source.name)
  const isActive = useEditorStore((s) => s.activeId === id)
  const setActive = useEditorStore((s) => s.setActive)
  const removeDoc = useEditorStore((s) => s.removeDoc)

  if (!id) return null

  return (
    <div style={style} className="flex items-center justify-center">
      <button
        onClick={() => setActive(id)}
        aria-label={`Seleccionar imagen ${name ?? ''}`}
        aria-current={isActive}
        className={`group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${isActive ? 'border-accent' : 'border-transparent'}`}
      >
        {previewUrl && <img src={previewUrl} alt="" className="h-full w-full object-cover" />}
        <span
          role="button"
          tabIndex={-1}
          aria-label={`Quitar ${name ?? 'imagen'}`}
          onClick={(e) => { e.stopPropagation(); removeDoc(id) }}
          className="absolute right-0 top-0 hidden h-4 w-4 items-center justify-center bg-black/70 text-white group-hover:flex"
        >
          <X size={10} />
        </span>
      </button>
    </div>
  )
}

export function Filmstrip({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <div style={{ height: STRIP_HEIGHT, width: '100%' }}>
      <Grid
        cellComponent={ThumbCell}
        cellProps={{ ids }}
        columnCount={ids.length}
        columnWidth={CELL_WIDTH}
        rowCount={1}
        rowHeight={STRIP_HEIGHT}
        defaultHeight={STRIP_HEIGHT}
        defaultWidth={Math.min(ids.length * CELL_WIDTH, 640)}
        overscanCount={4}
        aria-label="Imágenes cargadas"
        role="listbox"
      />
    </div>
  )
}
