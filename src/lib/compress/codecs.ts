// ─────────────────────────────────────────────────────────────
// Capa de códecs. Recibe RGBA crudo y devuelve bytes comprimidos.
//
// Herramientas (todas WASM, 100 % locales — nada sale del navegador):
//   PNG   → oxipng (@jsquash/oxipng); con pérdida: cuantización a paleta propia (quantize.ts) + oxipng
//   JPEG  → mozjpeg (@jsquash/jpeg)
//   WebP  → libwebp (@jsquash/webp)
//   AVIF  → libavif / aom (@jsquash/avif)
//   JXL   → libjxl (@jsquash/jxl)
//
// Cada códec se importa dinámicamente: solo se descarga el .wasm del formato
// que el usuario realmente usa (AVIF ≈ 3.5 MB, JXL ≈ 1.4 MB, el resto < 0.5 MB).
//
// Sin dependencias de DOM/canvas salvo `ImageData` (que existe en Workers);
// por eso se puede probar en Node con un polyfill mínimo.
// ─────────────────────────────────────────────────────────────
import { quantizeRGBA } from './quantize'
import type { CompressEffort, CompressFormat, CompressSettings } from './types'

export interface RawImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

const toImageData = (img: RawImage): ImageData =>
  new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height)

/** ¿Hay algún píxel no totalmente opaco? */
export function hasTransparency(img: RawImage): boolean {
  const d = img.data
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return true
  return false
}

/** Compone la imagen sobre un color sólido (necesario para JPEG, que no tiene alfa). Devuelve copia. */
export function flattenOnto(img: RawImage, hex: string): RawImage {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  const n = m ? parseInt(m[1], 16) : 0xffffff
  const br = (n >> 16) & 255, bg = (n >> 8) & 255, bb = n & 255
  const src = img.data
  const out = new Uint8ClampedArray(src.length)
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3] / 255
    out[i] = src[i] * a + br * (1 - a)
    out[i + 1] = src[i + 1] * a + bg * (1 - a)
    out[i + 2] = src[i + 2] * a + bb * (1 - a)
    out[i + 3] = 255
  }
  return { data: out, width: img.width, height: img.height }
}

// ── Mapeo de "esfuerzo" a parámetros de cada códec ──────────────────────
// Medido: el nivel 4 ya alcanza el mínimo; 5-6 duplican el tiempo sin ganar bytes.
const OXIPNG_LEVEL: Record<CompressEffort, number> = { fast: 1, balanced: 2, max: 4 }
const AVIF_SPEED: Record<CompressEffort, number> = { fast: 9, balanced: 6, max: 4 } // 0 = lento/mejor, 10 = rápido
const JXL_EFFORT: Record<CompressEffort, number> = { fast: 3, balanced: 7, max: 9 }
const WEBP_METHOD: Record<CompressEffort, number> = { fast: 2, balanced: 4, max: 6 }
// En libwebp lossless, `quality` NO es calidad visual sino esfuerzo de compresión (cwebp -z).
const WEBP_LOSSLESS_EFFORT: Record<CompressEffort, number> = { fast: 50, balanced: 75, max: 100 }

// ── PNG ─────────────────────────────────────────────────────────────────
async function encodePng(img: RawImage, s: CompressSettings, lossy: boolean): Promise<Uint8Array> {
  const { default: optimise } = await import('@jsquash/oxipng/optimise.js')
  const source: RawImage = lossy
    ? { data: quantizeRGBA(img.data, img.width, img.height, { colors: s.pngColors, dither: s.pngDither }), width: img.width, height: img.height }
    : img
  const buf = await optimise(toImageData(source), {
    level: OXIPNG_LEVEL[s.effort],
    interlace: false,
    // Solo toca el RGB de píxeles 100 % transparentes (invisibles) → sigue siendo visualmente idéntico.
    optimiseAlpha: true,
  })
  return new Uint8Array(buf)
}

// ── JPEG ────────────────────────────────────────────────────────────────
async function encodeJpeg(img: RawImage, s: CompressSettings): Promise<Uint8Array> {
  const { default: encode } = await import('@jsquash/jpeg/encode.js')
  const max = s.effort === 'max'
  const buf = await encode(toImageData(img), {
    quality: s.quality.jpeg,
    baseline: false,
    arithmetic: false,
    progressive: s.progressive,
    optimize_coding: true,
    smoothing: 0,
    color_space: 3, // YCbCr
    quant_table: 3,
    trellis_multipass: max,
    trellis_opt_zero: max,
    trellis_opt_table: max,
    trellis_loops: max ? 3 : 1,
    auto_subsample: false,
    chroma_subsample: s.chroma444 ? 1 : 2, // 1 = 4:4:4, 2 = 4:2:0
    separate_chroma_quality: false,
    chroma_quality: s.quality.jpeg,
  })
  return new Uint8Array(buf)
}

// ── WebP ────────────────────────────────────────────────────────────────
async function encodeWebp(img: RawImage, s: CompressSettings, lossless: boolean): Promise<Uint8Array> {
  const { default: encode } = await import('@jsquash/webp/encode.js')
  const buf = await encode(toImageData(img), {
    lossless: lossless ? 1 : 0,
    quality: lossless ? WEBP_LOSSLESS_EFFORT[s.effort] : s.quality.webp,
    method: WEBP_METHOD[s.effort],
    near_lossless: 100, // 100 = desactivado
    exact: 0,
    alpha_quality: 100,
    use_sharp_yuv: !lossless && s.effort === 'max' ? 1 : 0,
  })
  return new Uint8Array(buf)
}

// ── AVIF ────────────────────────────────────────────────────────────────
async function encodeAvif(img: RawImage, s: CompressSettings, lossless: boolean): Promise<Uint8Array> {
  const { default: encode } = await import('@jsquash/avif/encode.js')
  const buf = await encode(toImageData(img), {
    quality: lossless ? 100 : s.quality.avif,
    qualityAlpha: -1,
    speed: AVIF_SPEED[s.effort],
    subsample: lossless || s.chroma444 ? 3 : 1, // 3 = 4:4:4, 1 = 4:2:0 (lossless exige 4:4:4)
    lossless,
    bitDepth: 8,
    denoiseLevel: 0,
    tileRowsLog2: 0,
    tileColsLog2: 0,
    chromaDeltaQ: false,
    sharpness: 0,
    tune: 0,
    enableSharpYUV: false,
  })
  return new Uint8Array(buf)
}

// ── JPEG XL ─────────────────────────────────────────────────────────────
async function encodeJxl(img: RawImage, s: CompressSettings, lossless: boolean): Promise<Uint8Array> {
  const { default: encode } = await import('@jsquash/jxl/encode.js')
  const buf = await encode(toImageData(img), {
    lossless,
    quality: lossless ? 100 : s.quality.jxl,
    effort: JXL_EFFORT[s.effort],
    progressive: s.progressive,
    epf: -1,
    lossyPalette: false,
    decodingSpeedTier: 0,
    photonNoiseIso: 0,
    lossyModular: false,
  })
  return new Uint8Array(buf)
}

/** Decodifica un JXL a RGBA (los navegadores salvo Safari no lo muestran en <img>). */
export async function decodeJxl(bytes: Uint8Array): Promise<RawImage> {
  const { default: decode } = await import('@jsquash/jxl/decode.js')
  const out = await decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  return { data: out.data, width: out.width, height: out.height }
}

/**
 * Punto de entrada. `lossless` ya viene resuelto (ver effectiveMode en types.ts).
 * Para JPEG el llamador debe haber aplanado antes el canal alfa (flattenOnto).
 */
export async function encodeImage(
  img: RawImage,
  format: CompressFormat,
  s: CompressSettings,
  lossless: boolean,
): Promise<Uint8Array> {
  switch (format) {
    case 'png': return encodePng(img, s, !lossless)
    case 'jpeg': return encodeJpeg(img, s)
    case 'webp': return encodeWebp(img, s, lossless)
    case 'avif': return encodeAvif(img, s, lossless)
    case 'jxl': return encodeJxl(img, s, lossless)
  }
}
