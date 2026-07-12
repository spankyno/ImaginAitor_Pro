import * as Comlink from 'comlink'
import { renderPipeline } from '../lib/renderPipeline'
import type { EditOperation } from '../types/pipeline'

/**
 * Runs entirely off the main thread. The UI stays buttery smooth
 * (draggable sliders, crop handles) even while we recompute a full
 * 50-megapixel pipeline in the background.
 */
const api = {
  async render(source: ImageBitmap, ops: EditOperation[]) {
    const { canvas, width, height } = await renderPipeline(source, ops)
    const bitmap = canvas.transferToImageBitmap()
    return Comlink.transfer({ bitmap, width, height }, [bitmap])
  },

  async exportBlob(
    source: ImageBitmap,
    ops: EditOperation[],
    format: 'png' | 'jpeg' | 'webp' | 'avif',
    quality: number,
    scale: number,
  ) {
    const { canvas } = await renderPipeline(source, ops)
    let target = canvas
    if (scale !== 1) {
      const w = Math.max(1, Math.round(canvas.width * scale))
      const h = Math.max(1, Math.round(canvas.height * scale))
      const scaled = new OffscreenCanvas(w, h)
      const sctx = scaled.getContext('2d')!
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(canvas, 0, 0, w, h)
      target = scaled
    }
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : format === 'avif' ? 'image/avif' : 'image/png'
    const blob = await target.convertToBlob({ type: mime, quality: format === 'png' ? undefined : quality })
    return blob
  },
}

export type RenderWorkerApi = typeof api
Comlink.expose(api)
