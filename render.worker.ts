import * as Comlink from 'comlink'
import { renderPipeline, progressiveDownscale } from '../lib/renderPipeline'
import type { EditOperation } from '../types/pipeline'

/**
 * Runs entirely off the main thread. The UI stays buttery smooth
 * (draggable sliders, crop handles) even while we recompute a full
 * 50-megapixel pipeline in the background.
 *
 * Both entry points return a Blob (not an ImageBitmap): encoding happens
 * here via convertToBlob and the main thread only ever does
 * URL.createObjectURL(blob) — cheap, no giant base64 strings, and no
 * leftover ImageBitmap the caller would need to remember to .close().
 */
const PREVIEW_MAX_SIDE = 2048 // preview never needs to exceed screen resolution

const api = {
  /**
   * requestId is an opaque token supplied by the caller (the store). It has
   * no effect on the render itself — it's just echoed back so the caller
   * can cheaply detect "this result is for a request I've since
   * superseded" and discard it, without needing real AbortController
   * support (which structured-clone/Comlink calls don't have mid-flight).
   */
  async render(source: ImageBitmap, ops: EditOperation[], requestId: number) {
    const { canvas } = await renderPipeline(source, ops)
    let out = canvas
    if (canvas.width > PREVIEW_MAX_SIDE || canvas.height > PREVIEW_MAX_SIDE) {
      const scale = PREVIEW_MAX_SIDE / Math.max(canvas.width, canvas.height)
      out = progressiveDownscale(canvas, Math.round(canvas.width * scale), Math.round(canvas.height * scale))
    }
    const blob = await out.convertToBlob({ type: 'image/png' })
    return { blob, width: out.width, height: out.height, requestId }
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
      target = progressiveDownscale(canvas, w, h)
    }
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : format === 'avif' ? 'image/avif' : 'image/png'
    const blob = await target.convertToBlob({ type: mime, quality: format === 'png' ? undefined : quality })
    return blob
  },
}

export type RenderWorkerApi = typeof api
Comlink.expose(api)
