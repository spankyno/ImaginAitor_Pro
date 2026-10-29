import * as Comlink from 'comlink'
import { renderPipeline } from '../lib/renderPipeline'
import { decodeJxl, encodeImage, flattenOnto, hasTransparency, type RawImage } from '../lib/compress/codecs'
import { FORMATS, effectiveMode, resolveFormat, type CompressResult, type CompressSettings } from '../lib/compress/types'
import type { EditOperation } from '../types/pipeline'

/**
 * Worker de compresión. Es DISTINTO de render.worker a propósito:
 *  - Cargar un códec WASM (AVIF ≈ 3.5 MB) o codificar una imagen grande puede
 *    tardar segundos; si compartiera hilo con el render, los sliders de
 *    cualquier otra herramienta se quedarían esperando.
 *  - Se puede cancelar de verdad con worker.terminate() (un WASM en marcha no
 *    es interrumpible de otra forma) sin tumbar el render de la vista previa.
 *  - Se crea bajo demanda: quien nunca abre "Comprimir" no paga nada.
 *
 * Reutiliza renderPipeline: lo que se comprime es EXACTAMENTE el resultado del
 * pipeline no destructivo (recortes, ajustes, texto…), a resolución completa.
 */
const api = {
  async compress(
    source: ImageBitmap,
    ops: EditOperation[],
    settings: CompressSettings,
    sourceMime: string,
  ): Promise<CompressResult> {
    const t0 = performance.now()
    const { canvas } = await renderPipeline(source, ops)
    const { width, height } = canvas
    const px = canvas.getContext('2d')!.getImageData(0, 0, width, height)
    // Los píxeles ya están copiados: liberar el lienzo cuanto antes (en 50 MP son 200 MB).
    canvas.width = 0
    canvas.height = 0

    let raw: RawImage = { data: px.data, width, height }
    const format = resolveFormat(settings.target, sourceMime)
    const mode = effectiveMode(format, settings.mode)
    const hasAlpha = hasTransparency(raw)
    if (!FORMATS[format].supportsAlpha && hasAlpha) raw = flattenOnto(raw, settings.background)

    const bytes = await encodeImage(raw, format, settings, mode === 'lossless')
    const blob = new Blob([bytes as BlobPart], { type: FORMATS[format].mime })

    // Solo Safari muestra JXL en <img>: para el resto, decodificamos a PNG para la vista previa.
    let previewBlob: Blob | null = null
    if (format === 'jxl') {
      const dec = await decodeJxl(bytes)
      const c = new OffscreenCanvas(dec.width, dec.height)
      c.getContext('2d')!.putImageData(new ImageData(dec.data as Uint8ClampedArray<ArrayBuffer>, dec.width, dec.height), 0, 0)
      previewBlob = await c.convertToBlob({ type: 'image/png' })
    }

    return { blob, previewBlob, width, height, format, mode, hasAlpha, ms: Math.round(performance.now() - t0) }
  },
}

export type CompressWorkerApi = typeof api
Comlink.expose(api)
