import { useEffect, useState } from 'react'
import type { ImageDocument } from '../types/pipeline'

/**
 * Blob-URL preview of the pristine, untouched source bitmap — used by the
 * before/after compare slider and by the interactive crop tool (which must
 * show the image as it was before any crop, so the drag handles define a
 * new region rather than re-cropping an already-cropped preview).
 */
export function useOriginalPreviewUrl(doc: ImageDocument | undefined, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!doc || !enabled) return
    let cancelled = false
    let objectUrl: string | null = null
    const canvas = document.createElement('canvas')
    canvas.width = doc.source.width
    canvas.height = doc.source.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(doc.source.bitmap, 0, 0)
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }, 'image/png')
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [doc?.source.id, enabled])

  return url
}
