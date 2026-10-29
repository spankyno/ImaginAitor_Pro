import type { CropOp, EditOperation, ResizeOp } from '../types/pipeline'

/**
 * Pure size maths shared by the render worker and the UI panels.
 * Keeping it in one place guarantees that the numbers shown in the
 * text boxes ("1920 × 1080 px") are exactly what the pipeline renders.
 */
export interface Size { width: number; height: number }

/** Bounding box of a w×h image rotated by `degrees` (canvas grows to fit). */
export function rotatedSize(w: number, h: number, degrees: number): Size {
  const rad = (degrees * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  return { width: Math.round(w * cos + h * sin), height: Math.round(w * sin + h * cos) }
}

/** Pixel size the crop rectangle is expressed against (rotated canvas if the crop is rotated). */
export function cropBaseSize(before: Size, rotation: number): Size {
  return rotation ? rotatedSize(before.width, before.height, rotation) : before
}

export function cropOutputSize(before: Size, p: CropOp['params']): Size {
  const base = cropBaseSize(before, p.rotation)
  return {
    width: Math.max(1, Math.round(p.width * base.width)),
    height: Math.max(1, Math.round(p.height * base.height)),
  }
}

export function resizeTarget(sw: number, sh: number, p: ResizeOp['params']): Size {
  let tw = sw, th = sh
  if (p.mode === 'exact') {
    tw = Math.round(p.width); th = Math.round(p.height)
    if (p.keepAspect) th = Math.round(tw / (sw / sh))
  } else if (p.mode === 'percent') {
    tw = Math.round((sw * p.percent) / 100)
    th = Math.round((sh * p.percent) / 100)
  } else {
    const scale = Math.min(1, p.maxSide / Math.max(sw, sh))
    tw = Math.round(sw * scale)
    th = Math.round(sh * scale)
  }
  return { width: Math.max(1, tw), height: Math.max(1, th) }
}

function applyOpSize(size: Size, op: EditOperation): Size {
  switch (op.type) {
    case 'crop': return cropOutputSize(size, op.params)
    case 'resize': return resizeTarget(size.width, size.height, op.params)
    case 'rotate': return rotatedSize(size.width, size.height, op.params.degrees)
    default: return size
  }
}

/** Size of the image just BEFORE the op with `opId` runs (or the final size if opId is null). */
export function sizeBeforeOp(source: Size, ops: EditOperation[], opId: string | null): Size {
  let size: Size = { width: source.width, height: source.height }
  for (const op of ops) {
    if (op.id === opId) break
    if (op.enabled) size = applyOpSize(size, op)
  }
  return size
}
