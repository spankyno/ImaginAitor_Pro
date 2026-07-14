import { useEffect, useRef, useState } from 'react'
import { getRenderWorker } from '../lib/workerClient'
import type { ImageDocument } from '../types/pipeline'

/**
 * While the Text/Shapes tool is active we hand full interactive control of
 * those layers to Konva — so the pixels underneath must NOT already have
 * text/shapes baked in, or the user would see a duplicate: one flat/baked
 * copy from the normal preview pipeline, plus a live draggable one on top.
 *
 * This renders a second, lightweight preview with every text/shape op
 * filtered out (everything else — crop, resize, adjustments, filters,
 * pixelation — still applies), purely for use as the base image under the
 * Konva overlay. It's independent of the main store-driven preview so it
 * never fights it over debounce/generation bookkeeping.
 */
export function useBaseLayerPreview(doc: ImageDocument | undefined, enabled: boolean) {
  const [state, setState] = useState<{ url: string; width: number; height: number } | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!doc || !enabled) return
    let cancelled = false
    const filteredOps = doc.ops.filter((o) => o.type !== 'text' && o.type !== 'shape')

    const timer = setTimeout(async () => {
      try {
        const result = await getRenderWorker().render(doc.source.bitmap, filteredOps, -1)
        if (cancelled) return
        const url = URL.createObjectURL(result.blob)
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        setState({ url, width: result.width, height: result.height })
      } catch (e) {
        console.error('Base layer preview failed', e)
      }
    }, 80)

    return () => { cancelled = true; clearTimeout(timer) }
    // Only the non-text/shape ops should trigger a recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, enabled, JSON.stringify(doc?.ops.filter((o) => o.type !== 'text' && o.type !== 'shape'))])

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  return state
}
