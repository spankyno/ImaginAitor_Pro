import * as Comlink from 'comlink'

/**
 * Dedicated, lightweight worker for filmstrip thumbnails — deliberately
 * separate from render.worker.ts. Full pipeline preview rendering (crop,
 * resize, adjustments, filters, text, shapes...) is comparatively heavy and
 * capped at 2048px; a thumbnail only ever needs ~112px (2x a 56px slot).
 * Keeping them on different workers means importing a batch of 300 photos
 * doesn't make every full-resolution edit render wait behind a backlog of
 * thumbnail jobs, or vice versa.
 */
const THUMB_MAX_SIDE = 112

const api = {
  async makeThumbnail(bitmap: ImageBitmap) {
    const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'medium' // thumbnails don't need the progressive-halving path
    ctx.drawImage(bitmap, 0, 0, w, h)
    try { bitmap.close() } catch { /* clone from Comlink, safe to close */ }
    return canvas.convertToBlob({ type: 'image/webp', quality: 0.7 })
  },
}

export type ThumbnailWorkerApi = typeof api
Comlink.expose(api)
