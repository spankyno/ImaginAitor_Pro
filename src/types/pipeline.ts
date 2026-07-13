// ─────────────────────────────────────────────────────────────
// ImaginAitor_Pro — Non-destructive pipeline type definitions
// Every edit is a serializable, reorderable, toggleable operation.
// The preview is ALWAYS: originalBitmap -> op1 -> op2 -> ... -> opN
// ─────────────────────────────────────────────────────────────

export type OpType =
  | 'crop'
  | 'resize'
  | 'rotate'
  | 'flip'
  | 'adjust'
  | 'filter'
  | 'text'
  | 'shape'
  | 'pixelate'

export interface BaseOp {
  id: string
  type: OpType
  enabled: boolean
  label: string
}

export interface CropOp extends BaseOp {
  type: 'crop'
  params: {
    // normalized 0..1 relative to the image BEFORE this op
    x: number
    y: number
    width: number
    height: number
    rotation: number // free rotation of the crop, degrees
  }
}

export interface ResizeOp extends BaseOp {
  type: 'resize'
  params: {
    mode: 'exact' | 'percent' | 'fit'
    width: number
    height: number
    percent: number
    maxSide: number
    keepAspect: boolean
    quality: 'fast' | 'high' // high => pica-like Lanczos, fast => browser bicubic
  }
}

export interface RotateOp extends BaseOp {
  type: 'rotate'
  params: {
    degrees: number // 0 | 90 | 180 | 270 | free value
  }
}

export interface FlipOp extends BaseOp {
  type: 'flip'
  params: {
    horizontal: boolean
    vertical: boolean
  }
}

export interface AdjustOp extends BaseOp {
  type: 'adjust'
  params: {
    brightness: number // -100..100
    contrast: number // -100..100
    saturation: number // -100..100
    exposure: number // -100..100
    temperature: number // -100 (cool) .. 100 (warm)
    sharpness: number // 0..100
    blur: number // 0..20 px
  }
}

export type FilterPreset =
  | 'none'
  | 'bw'
  | 'sepia'
  | 'vintage'
  | 'cool'
  | 'warm'
  | 'fade'
  | 'vivid'
  | 'noir'

export interface FilterOp extends BaseOp {
  type: 'filter'
  params: {
    preset: FilterPreset
    intensity: number // 0..100
  }
}

export interface TextOp extends BaseOp {
  type: 'text'
  params: {
    text: string
    x: number // normalized 0..1
    y: number
    fontSize: number // relative to image width, in px at 1000px ref width
    fontFamily: string
    color: string
    align: 'left' | 'center' | 'right'
    rotation: number
    shadow: boolean
    bold: boolean
    italic: boolean
  }
}

export type ShapeKind = 'rectangle' | 'ellipse' | 'arrow' | 'marker'

export interface ShapeOp extends BaseOp {
  type: 'shape'
  params: {
    kind: ShapeKind
    x: number
    y: number
    width: number
    height: number
    color: string
    strokeWidth: number
    fill: boolean
  }
}

export interface PixelateOp extends BaseOp {
  type: 'pixelate'
  params: {
    x: number
    y: number
    width: number
    height: number
    mode: 'pixelate' | 'blur'
    strength: number // 4..40 block size / blur radius
  }
}

export type EditOperation =
  | CropOp
  | ResizeOp
  | RotateOp
  | FlipOp
  | AdjustOp
  | FilterOp
  | TextOp
  | ShapeOp
  | PixelateOp

export interface SourceImage {
  id: string
  name: string
  mimeType: string
  originalSize: number // bytes
  width: number
  height: number
  bitmap: ImageBitmap
}

export interface ImageDocument {
  id: string
  source: SourceImage
  ops: EditOperation[]
  createdAt: number
}

export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp' | 'avif'
  quality: number // 0..1
  fileName: string
  scale: number // export scale multiplier applied on top of pipeline size
}
