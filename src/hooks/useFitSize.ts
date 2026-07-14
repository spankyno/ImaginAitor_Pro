import { useEffect, useState } from 'react'

export interface FitSize { width: number; height: number }

/**
 * Computes the "object-contain" box (in CSS pixels, at zoom=1) that fits
 * `naturalWidth`x`naturalHeight` inside the observed container. Rendering
 * the image and its interactive overlays at this EXACT explicit size
 * (rather than relying on max-width/max-height:auto + object-fit) is what
 * lets overlay components map pointer coordinates to normalized [0,1] image
 * space using nothing more than their own getBoundingClientRect() — which
 * stays correct even under the canvas's zoom/pan CSS transform.
 */
export function useFitSize(
  containerRef: React.RefObject<HTMLElement | null>,
  naturalWidth: number,
  naturalHeight: number,
  padding = 0,
): FitSize {
  const [size, setSize] = useState<FitSize>({ width: naturalWidth, height: naturalHeight })

  useEffect(() => {
    const el = containerRef.current
    if (!el || !naturalWidth || !naturalHeight) return

    const compute = (cw: number, ch: number) => {
      const availW = Math.max(1, cw - padding * 2)
      const availH = Math.max(1, ch - padding * 2)
      const scale = Math.min(availW / naturalWidth, availH / naturalHeight)
      setSize({ width: Math.round(naturalWidth * scale), height: Math.round(naturalHeight * scale) })
    }

    const rect = el.getBoundingClientRect()
    compute(rect.width, rect.height)

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      compute(width, height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, naturalWidth, naturalHeight, padding])

  return size
}
