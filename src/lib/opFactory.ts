import { genId } from '../utils/id'
import type {
  AdjustOp, CropOp, FilterOp, FlipOp, PixelateOp, ResizeOp, RotateOp, ShapeOp, TextOp,
} from '../types/pipeline'

export const createCropOp = (overrides: Partial<CropOp['params']> = {}): CropOp => ({
  id: genId(), type: 'crop', enabled: true, label: 'Recorte',
  params: { x: 0, y: 0, width: 1, height: 1, rotation: 0, ...overrides },
})

export const createResizeOp = (overrides: Partial<ResizeOp['params']> = {}): ResizeOp => ({
  id: genId(), type: 'resize', enabled: true, label: 'Redimensionar',
  params: {
    mode: 'fit', width: 1920, height: 1080, percent: 100, maxSide: 2048,
    keepAspect: true, quality: 'high', ...overrides,
  },
})

export const createRotateOp = (degrees: number): RotateOp => ({
  id: genId(), type: 'rotate', enabled: true, label: `Rotar ${degrees}°`,
  params: { degrees },
})

export const createFlipOp = (horizontal: boolean, vertical: boolean): FlipOp => ({
  id: genId(), type: 'flip', enabled: true,
  label: horizontal ? 'Voltear horizontal' : 'Voltear vertical',
  params: { horizontal, vertical },
})

export const createAdjustOp = (overrides: Partial<AdjustOp['params']> = {}): AdjustOp => ({
  id: genId(), type: 'adjust', enabled: true, label: 'Ajustes',
  params: {
    brightness: 0, contrast: 0, saturation: 0, exposure: 0,
    temperature: 0, sharpness: 0, blur: 0, ...overrides,
  },
})

export const createFilterOp = (preset: FilterOp['params']['preset']): FilterOp => ({
  id: genId(), type: 'filter', enabled: true, label: `Filtro: ${preset}`,
  params: { preset, intensity: 100 },
})

export const createTextOp = (overrides: Partial<TextOp['params']> = {}): TextOp => ({
  id: genId(), type: 'text', enabled: true, label: 'Texto',
  params: {
    text: 'Texto', x: 0.5, y: 0.5, fontSize: 48, fontFamily: 'Inter, sans-serif',
    color: '#ffffff', align: 'center', rotation: 0, shadow: true, bold: true, italic: false,
    ...overrides,
  },
})

export const createShapeOp = (kind: ShapeOp['params']['kind']): ShapeOp => ({
  id: genId(), type: 'shape', enabled: true, label: `Forma: ${kind}`,
  params: { kind, x: 0.3, y: 0.3, width: 0.3, height: 0.2, color: '#7c5cff', strokeWidth: 6, fill: false },
})

export const createPixelateOp = (overrides: Partial<PixelateOp['params']> = {}): PixelateOp => ({
  id: genId(), type: 'pixelate', enabled: true, label: 'Pixelar / Difuminar',
  params: { x: 0.3, y: 0.3, width: 0.3, height: 0.2, mode: 'pixelate', strength: 16, ...overrides },
})
