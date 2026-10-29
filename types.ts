// ─────────────────────────────────────────────────────────────
// Compresión — tipos y metadatos compartidos (UI, store y worker).
// Este módulo es PURO: sin DOM, sin canvas, sin WASM. Se puede importar
// desde cualquier sitio sin arrastrar códecs al bundle principal.
// ─────────────────────────────────────────────────────────────

export type CompressFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'jxl'
/** 'auto' = mantener el formato del archivo original. */
export type CompressTarget = 'auto' | CompressFormat
export type CompressMode = 'lossless' | 'lossy'
export type CompressEffort = 'fast' | 'balanced' | 'max'

/** Formatos cuya calidad se controla con un slider 1..100 en modo lossy. */
export type QualityFormat = Exclude<CompressFormat, 'png'>

export interface CompressSettings {
  target: CompressTarget
  mode: CompressMode
  /** Calidad por formato: las escalas de mozjpeg, libavif y libjxl NO son equivalentes entre sí. */
  quality: Record<QualityFormat, number>
  effort: CompressEffort
  /** PNG con pérdida: nº máximo de colores de la paleta (2..256). */
  pngColors: number
  /** PNG con pérdida: tramado Floyd–Steinberg (suaviza degradados; pesa algo más). */
  pngDither: boolean
  /** JPEG/AVIF con pérdida: conservar el color a resolución completa (4:4:4). Mejor para capturas con texto. */
  chroma444: boolean
  /** JPEG/JXL: carga progresiva (suele pesar menos y se ve antes). */
  progressive: boolean
  /** JPEG no admite transparencia: color con el que se rellena. */
  background: string
}

export const DEFAULT_SETTINGS: CompressSettings = {
  target: 'auto',
  mode: 'lossless',
  quality: { jpeg: 80, webp: 80, avif: 55, jxl: 75 },
  effort: 'balanced',
  pngColors: 256,
  pngDither: true,
  chroma444: false,
  progressive: true,
  background: '#ffffff',
}

export interface FormatInfo {
  label: string
  ext: string
  mime: string
  /** ¿Existe una compresión realmente sin pérdida al recodificar píxeles? */
  supportsLossless: boolean
  supportsAlpha: boolean
}

export const FORMATS: Record<CompressFormat, FormatInfo> = {
  png: { label: 'PNG', ext: 'png', mime: 'image/png', supportsLossless: true, supportsAlpha: true },
  jpeg: { label: 'JPEG', ext: 'jpg', mime: 'image/jpeg', supportsLossless: false, supportsAlpha: false },
  webp: { label: 'WebP', ext: 'webp', mime: 'image/webp', supportsLossless: true, supportsAlpha: true },
  avif: { label: 'AVIF', ext: 'avif', mime: 'image/avif', supportsLossless: true, supportsAlpha: true },
  jxl: { label: 'JPEG XL', ext: 'jxl', mime: 'image/jxl', supportsLossless: true, supportsAlpha: true },
}

export const FORMAT_ORDER: CompressFormat[] = ['png', 'jpeg', 'webp', 'avif', 'jxl']

/** Formato real de salida dado el objetivo elegido y el MIME del archivo original. */
export function resolveFormat(target: CompressTarget, sourceMime: string): CompressFormat {
  if (target !== 'auto') return target
  const m = sourceMime.toLowerCase()
  if (m === 'image/jpeg' || m === 'image/jpg' || m === 'image/pjpeg') return 'jpeg'
  if (m === 'image/webp') return 'webp'
  if (m === 'image/avif') return 'avif'
  if (m === 'image/jxl') return 'jxl'
  // PNG, GIF, BMP, SVG, HEIC, desconocidos… → PNG (sin pérdida y universal).
  return 'png'
}

/** Modo efectivo: JPEG no tiene modo lossless al recodificar píxeles. */
export function effectiveMode(format: CompressFormat, mode: CompressMode): CompressMode {
  return FORMATS[format].supportsLossless ? mode : 'lossy'
}

export interface CompressResult {
  blob: Blob
  /** Solo para formatos que el navegador no sabe mostrar (JXL): PNG decodificado para la vista previa. */
  previewBlob: Blob | null
  width: number
  height: number
  format: CompressFormat
  mode: CompressMode
  hasAlpha: boolean
  ms: number
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
