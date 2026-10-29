import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Text as KText, Rect as KRect, Ellipse as KEllipse, Arrow as KArrow, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '../../../store/useEditorStore'
import { useUiStore } from '../../../store/useUiStore'
import type { ShapeOp, TextOp } from '../../../types/pipeline'

/**
 * Renders every text/shape op as a real, selectable Konva node stacked over
 * the (already zoom/pan-transformed) preview image. This is the "capas
 * totalmente interactivas" layer: click to select, shift-click to add to
 * selection, drag to move, corner handles to resize/rotate — for one or
 * several layers at once via a single shared Transformer.
 *
 * Konva nodes are a *view* over the same EditOperation[] the rest of the
 * app already treats as the source of truth — every gesture here ends by
 * writing normalized params back into the store via updateOp(), so sliders
 * in the side panel and this canvas stay in sync automatically either way.
 */
export function KonvaLayerEditor({ docId, width, height }: { docId: string; width: number; height: number }) {
  const doc = useEditorStore((s) => s.docs[docId]?.doc)
  const updateOp = useEditorStore((s) => s.updateOp)
  const removeOp = useEditorStore((s) => s.removeOp)
  // IMPORTANT: select the primitive, not `(s) => s.selectedOpId ? [s.selectedOpId] : []`.
  // Zustand's hook is built on useSyncExternalStore, which requires getSnapshot()
  // to return a referentially stable result when the underlying state hasn't
  // changed. A selector that allocates a brand-new array on every call breaks
  // that contract and makes React re-render forever ("Maximum update depth
  // exceeded" / error #185) — exactly what caused the canvas to go blank.
  const selectedOpId = useUiStore((s) => s.selectedOpId)
  const setSelectedOpId = useUiStore((s) => s.setSelectedOpId)
  const selectedIds = useMemo(() => (selectedOpId ? [selectedOpId] : []), [selectedOpId])
  const [multiSelected, setMultiSelected] = useState<string[]>([])

  const nodeRefs = useRef<Record<string, Konva.Node | null>>({})
  const trRef = useRef<Konva.Transformer>(null)

  const layers = (doc?.ops.filter((o) => (o.type === 'text' || o.type === 'shape') && o.enabled) ?? []) as (TextOp | ShapeOp)[]
  const activeSelection = multiSelected.length ? multiSelected : selectedIds

  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const nodes = activeSelection.map((id) => nodeRefs.current[id]).filter((n): n is Konva.Node => !!n)
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [activeSelection, layers.length])

  // Delete/Backspace removes every selected layer, unless the user is
  // typing somewhere else on the page (an input/textarea has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeSelection.length) {
        e.preventDefault()
        activeSelection.forEach((id) => removeOp(docId, id))
        setMultiSelected([])
        setSelectedOpId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSelection, docId, removeOp, setSelectedOpId])

  const select = (id: string, shiftKey: boolean) => {
    if (shiftKey) {
      setMultiSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
      setSelectedOpId(null)
    } else {
      setMultiSelected([])
      setSelectedOpId(id)
    }
  }

  const deselectAll = () => { setMultiSelected([]); setSelectedOpId(null) }

  const commitTransform = (op: TextOp | ShapeOp, node: Konva.Node) => {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const rotation = node.rotation()

    if (op.type === 'text') {
      const avgScale = (scaleX + scaleY) / 2
      updateOp(docId, op.id, {
        x: node.x() / width,
        y: node.y() / height,
        fontSize: Math.max(4, Math.round(op.params.fontSize * avgScale)),
        rotation,
      })
    } else {
      const kind = op.params.kind
      if (kind === 'ellipse') {
        const ellipse = node as Konva.Ellipse
        const newRx = ellipse.radiusX() * scaleX
        const newRy = ellipse.radiusY() * scaleY
        updateOp(docId, op.id, {
          x: (node.x() - newRx) / width,
          y: (node.y() - newRy) / height,
          width: (newRx * 2) / width,
          height: (newRy * 2) / height,
          rotation,
        })
      } else {
        const newW = Math.max(4, op.params.width * width * scaleX)
        const newH = Math.max(4, op.params.height * height * scaleY)
        updateOp(docId, op.id, {
          x: node.x() / width,
          y: node.y() / height,
          width: newW / width,
          height: newH / height,
          rotation,
        })
      }
    }
    node.scaleX(1)
    node.scaleY(1)
  }

  const commitDrag = (op: TextOp | ShapeOp, node: Konva.Node) => {
    if (op.type === 'shape' && op.params.kind === 'ellipse') {
      const ellipse = node as Konva.Ellipse
      updateOp(docId, op.id, { x: (node.x() - ellipse.radiusX()) / width, y: (node.y() - ellipse.radiusY()) / height })
    } else {
      updateOp(docId, op.id, { x: node.x() / width, y: node.y() / height })
    }
  }

  return (
    <Stage width={width} height={height} onMouseDown={(e) => { if (e.target === e.target.getStage()) deselectAll() }}>
      <Layer>
        {layers.map((op) => {
          const isSelected = activeSelection.includes(op.id)
          const common = {
            key: op.id,
            ref: (node: Konva.Node | null) => { nodeRefs.current[op.id] = node },
            draggable: true,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => select(op.id, e.evt.shiftKey),
            onTap: () => select(op.id, false),
            onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => commitDrag(op, e.target),
            onTransformEnd: (e: Konva.KonvaEventObject<Event>) => commitTransform(op, e.target),
            rotation: op.params.rotation,
            stroke: isSelected ? '#7c5cff' : undefined,
            strokeWidth: isSelected ? 1 : 0,
            strokeScaleEnabled: false,
          }

          if (op.type === 'text') {
            const fontSizePx = (op.params.fontSize / 1000) * width
            return (
              <KText
                {...common}
                x={op.params.x * width}
                y={op.params.y * height}
                text={op.params.text}
                fontSize={fontSizePx}
                fontFamily={op.params.fontFamily}
                fontStyle={`${op.params.italic ? 'italic ' : ''}${op.params.bold ? 'bold' : 'normal'}`}
                fill={op.params.color}
                align={op.params.align}
                shadowColor={op.params.shadow ? 'black' : undefined}
                shadowBlur={op.params.shadow ? fontSizePx * 0.15 : 0}
                shadowOpacity={op.params.shadow ? 0.6 : 0}
              />
            )
          }

          const px = op.params.x * width, py = op.params.y * height
          const pw = op.params.width * width, ph = op.params.height * height
          const shapeProps = { stroke: op.params.color, strokeWidth: op.params.strokeWidth, fill: op.params.fill ? op.params.color : undefined }

          if (op.params.kind === 'rectangle' || op.params.kind === 'marker') {
            return <KRect {...common} x={px} y={py} width={pw} height={ph} opacity={op.params.kind === 'marker' ? 0.4 : 1} fill={op.params.kind === 'marker' ? op.params.color : shapeProps.fill} stroke={op.params.kind === 'marker' ? undefined : shapeProps.stroke} strokeWidth={op.params.kind === 'marker' ? 0 : shapeProps.strokeWidth} />
          }
          if (op.params.kind === 'ellipse') {
            return <KEllipse {...common} x={px + pw / 2} y={py + ph / 2} radiusX={pw / 2} radiusY={ph / 2} {...shapeProps} />
          }
          // arrow
          return <KArrow {...common} x={px} y={py} points={[0, 0, pw, ph]} pointerLength={shapeProps.strokeWidth * 4} pointerWidth={shapeProps.strokeWidth * 4} fill={op.params.color} stroke={op.params.color} strokeWidth={shapeProps.strokeWidth} />
        })}
        <Transformer ref={trRef} rotateEnabled anchorSize={9} borderStroke="#7c5cff" anchorStroke="#7c5cff" anchorFill="#ffffff" />
      </Layer>
    </Stage>
  )
}
