import type { EditOperation, AdjustOp, FilterOp, CropOp, ResizeOp, RotateOp, FlipOp, TextOp, ShapeOp, PixelateOp } from '../types/pipeline'

/**
 * The heart of ImaginAitor_Pro's non-destructive pipeline.
 *
 * renderPipeline() NEVER mutates the original bitmap. It takes the pristine
 * source ImageBitmap and replays every enabled operation, in order, onto a
 * fresh OffscreenCanvas. This is what makes toggling / reordering / deleting
 * a step in the History panel instant and lossless: we just re-run this
 * function with a different `ops` array.
 *
 * Runs inside render.worker.ts so the main thread / UI never blocks, even
 * on 50MP source images.
 */
export interface RenderResult {
  canvas: OffscreenCanvas
  width: number
  height: number
}

export async function renderPipeline(
  source: ImageBitmap,
  ops: EditOperation[],
): Promise<RenderResult> {
  let canvas = new OffscreenCanvas(source.width, source.height)
  let ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0)
  // `source` here is a structured-clone of the main thread's bitmap (Comlink
  // clones ImageBitmaps by default rather than transferring them, so the
  // original on the main thread stays intact and reusable). Once its pixels
  // are baked into `canvas` we no longer need this clone — close it
  // immediately rather than waiting for GC, since ImageBitmaps can hold
  // significant raw pixel / GPU memory for large photos.
  try { source.close() } catch { /* already closed or not closable */ }

  for (const op of ops) {
    if (!op.enabled) continue
    switch (op.type) {
      case 'crop':
        ;({ canvas, ctx } = applyCrop(canvas, ctx, op))
        break
      case 'resize':
        ;({ canvas, ctx } = await applyResize(canvas, op))
        break
      case 'rotate':
        ;({ canvas, ctx } = applyRotate(canvas, op))
        break
      case 'flip':
        ;({ canvas, ctx } = applyFlip(canvas, op))
        break
      case 'adjust':
        applyAdjust(canvas, ctx, op)
        break
      case 'filter':
        applyFilter(canvas, ctx, op)
        break
      case 'text':
        applyText(ctx, canvas, op)
        break
      case 'shape':
        applyShape(ctx, canvas, op)
        break
      case 'pixelate':
        applyPixelate(canvas, ctx, op)
        break
    }
  }

  return { canvas, width: canvas.width, height: canvas.height }
}

// ── CROP ─────────────────────────────────────────────────────
function applyCrop(canvas: OffscreenCanvas, _ctx: OffscreenCanvasRenderingContext2D, op: CropOp) {
  const { x, y, width, height, rotation } = op.params
  const sw = canvas.width, sh = canvas.height

  // if there's crop rotation, first rotate the whole canvas around its center
  let work = canvas
  if (rotation) {
    work = rotateCanvas(canvas, rotation)
  }

  const px = Math.round(x * work.width)
  const py = Math.round(y * work.height)
  const pw = Math.max(1, Math.round(width * work.width))
  const ph = Math.max(1, Math.round(height * work.height))

  const out = new OffscreenCanvas(pw, ph)
  const octx = out.getContext('2d')!
  octx.drawImage(work, px, py, pw, ph, 0, 0, pw, ph)
  return { canvas: out, ctx: octx }
  // sw/sh kept for potential future clamping logic
  void sw; void sh
}

function rotateCanvas(canvas: OffscreenCanvas, degrees: number) {
  const rad = (degrees * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const w = canvas.width, h = canvas.height
  const newW = Math.round(w * cos + h * sin)
  const newH = Math.round(w * sin + h * cos)
  const out = new OffscreenCanvas(newW, newH)
  const octx = out.getContext('2d')!
  octx.translate(newW / 2, newH / 2)
  octx.rotate(rad)
  octx.drawImage(canvas, -w / 2, -h / 2)
  return out
}

// ── RESIZE (high quality) ───────────────────────────────────
async function applyResize(canvas: OffscreenCanvas, op: ResizeOp) {
  const { mode, width, height, percent, maxSide, keepAspect, quality } = op.params
  const sw = canvas.width, sh = canvas.height
  let tw = sw, th = sh

  if (mode === 'exact') {
    tw = Math.round(width); th = Math.round(height)
    if (keepAspect) {
      const ratio = sw / sh
      th = Math.round(tw / ratio)
    }
  } else if (mode === 'percent') {
    tw = Math.round((sw * percent) / 100)
    th = Math.round((sh * percent) / 100)
  } else if (mode === 'fit') {
    const scale = Math.min(1, maxSide / Math.max(sw, sh))
    tw = Math.round(sw * scale)
    th = Math.round(sh * scale)
  }
  tw = Math.max(1, tw); th = Math.max(1, th)
  if (tw === sw && th === sh) return { canvas, ctx: canvas.getContext('2d')! }

  const out = progressiveDownscale(canvas, tw, th, quality === 'high')
  return { canvas: out, ctx: out.getContext('2d')! }
}

/**
 * High quality path: progressive downscale (halving) avoids the muddiness
 * of a single-step browser resize on large ratio reductions — the same
 * trick used by pica internally, without the extra dependency weight
 * inside the worker. Also used to cap preview resolution independently of
 * the user's chosen export size, which is what keeps sliders/crop feeling
 * instant even on 50MP sources.
 */
export function progressiveDownscale(canvas: OffscreenCanvas, tw: number, th: number, highQuality = true): OffscreenCanvas {
  let work: OffscreenCanvas = canvas
  if (highQuality) {
    let cw = canvas.width, ch = canvas.height
    while (cw > tw * 2 || ch > th * 2) {
      cw = Math.max(tw, Math.round(cw / 2))
      ch = Math.max(th, Math.round(ch / 2))
      const step = new OffscreenCanvas(cw, ch)
      const sctx = step.getContext('2d')!
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(work, 0, 0, cw, ch)
      work = step
    }
  }
  const out = new OffscreenCanvas(tw, th)
  const octx = out.getContext('2d')!
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(work, 0, 0, tw, th)
  return out
}

// ── ROTATE (fixed / free) ───────────────────────────────────
function applyRotate(canvas: OffscreenCanvas, op: RotateOp) {
  const out = rotateCanvas(canvas, op.params.degrees)
  return { canvas: out, ctx: out.getContext('2d')! }
}

// ── FLIP ─────────────────────────────────────────────────────
function applyFlip(canvas: OffscreenCanvas, op: FlipOp) {
  const { horizontal, vertical } = op.params
  const out = new OffscreenCanvas(canvas.width, canvas.height)
  const octx = out.getContext('2d')!
  octx.translate(horizontal ? out.width : 0, vertical ? out.height : 0)
  octx.scale(horizontal ? -1 : 1, vertical ? -1 : 1)
  octx.drawImage(canvas, 0, 0)
  return { canvas: out, ctx: octx }
}

// ── ADJUST (brightness/contrast/saturation/exposure/temp/sharpen/blur) ──
function applyAdjust(canvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D, op: AdjustOp) {
  const { brightness, contrast, saturation, exposure, temperature, sharpness, blur } = op.params

  const filters: string[] = []
  const b = 1 + (brightness + exposure * 0.7) / 100
  filters.push(`brightness(${Math.max(0, b)})`)
  filters.push(`contrast(${1 + contrast / 100})`)
  filters.push(`saturate(${Math.max(0, 1 + saturation / 100)})`)
  if (blur > 0) filters.push(`blur(${blur}px)`)

  if (filters.length) {
    const snapshot = new OffscreenCanvas(canvas.width, canvas.height)
    const sctx = snapshot.getContext('2d')!
    sctx.drawImage(canvas, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.filter = filters.join(' ')
    ctx.drawImage(snapshot, 0, 0)
    ctx.filter = 'none'
  }

  if (temperature !== 0 || sharpness > 0) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    if (temperature !== 0) applyTemperature(imgData, temperature)
    if (sharpness > 0) applySharpen(imgData, sharpness)
    ctx.putImageData(imgData, 0, 0)
  }
}

function applyTemperature(imageData: ImageData, amount: number) {
  const d = imageData.data
  const warm = amount > 0
  const strength = Math.abs(amount) / 100
  const rShift = warm ? strength * 30 : -strength * 20
  const bShift = warm ? -strength * 30 : strength * 20
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp8(d[i] + rShift)
    d[i + 2] = clamp8(d[i + 2] + bShift)
  }
}

function applySharpen(imageData: ImageData, amount: number) {
  const { width, height, data } = imageData
  const amt = amount / 100
  const src = new Uint8ClampedArray(data)
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const idx = (x: number, y: number) => (y * width + x) * 4
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, k = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[idx(x + kx, y + ky) + c] * kernel[k++]
          }
        }
        const orig = src[idx(x, y) + c]
        data[idx(x, y) + c] = clamp8(orig + (sum - orig) * amt)
      }
    }
  }
}

const clamp8 = (v: number) => Math.min(255, Math.max(0, v))

// ── FILTER PRESETS ───────────────────────────────────────────
function applyFilter(canvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D, op: FilterOp) {
  const { preset, intensity } = op.params
  if (preset === 'none') return
  const amt = intensity / 100

  const presetFilters: Record<string, string> = {
    bw: `grayscale(${amt})`,
    sepia: `sepia(${amt})`,
    vintage: `sepia(${0.35 * amt}) contrast(${1 - 0.1 * amt}) saturate(${1 - 0.3 * amt}) brightness(${1 + 0.05 * amt})`,
    cool: `saturate(${1 + 0.1 * amt}) hue-rotate(${15 * amt}deg)`,
    warm: `saturate(${1 + 0.1 * amt}) hue-rotate(${-15 * amt}deg) sepia(${0.15 * amt})`,
    fade: `contrast(${1 - 0.25 * amt}) saturate(${1 - 0.25 * amt}) brightness(${1 + 0.05 * amt})`,
    vivid: `saturate(${1 + 0.6 * amt}) contrast(${1 + 0.15 * amt})`,
    noir: `grayscale(${amt}) contrast(${1 + 0.4 * amt}) brightness(${1 - 0.05 * amt})`,
  }
  const f = presetFilters[preset]
  if (!f) return

  const snapshot = new OffscreenCanvas(canvas.width, canvas.height)
  const sctx = snapshot.getContext('2d')!
  sctx.drawImage(canvas, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.filter = f
  ctx.drawImage(snapshot, 0, 0)
  ctx.filter = 'none'
}

// ── TEXT ─────────────────────────────────────────────────────
function applyText(ctx: OffscreenCanvasRenderingContext2D, canvas: OffscreenCanvas, op: TextOp) {
  const { text, x, y, fontSize, fontFamily, color, align, rotation, shadow, bold, italic } = op.params
  const scaledFont = (fontSize / 1000) * canvas.width
  ctx.save()
  ctx.translate(x * canvas.width, y * canvas.height)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.font = `${italic ? 'italic ' : ''}${bold ? '700' : '400'} ${scaledFont}px ${fontFamily}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = scaledFont * 0.15
    ctx.shadowOffsetY = scaledFont * 0.04
  }
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

// ── SHAPES ───────────────────────────────────────────────────
function applyShape(ctx: OffscreenCanvasRenderingContext2D, canvas: OffscreenCanvas, op: ShapeOp) {
  const { kind, x, y, width, height, color, strokeWidth, fill, rotation } = op.params
  const px = x * canvas.width, py = y * canvas.height
  const pw = width * canvas.width, ph = height * canvas.height
  ctx.save()
  if (rotation) {
    const cx = px + pw / 2, cy = py + ph / 2
    ctx.translate(cx, cy)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = strokeWidth

  if (kind === 'rectangle') {
    fill ? ctx.fillRect(px, py, pw, ph) : ctx.strokeRect(px, py, pw, ph)
  } else if (kind === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2)
    fill ? ctx.fill() : ctx.stroke()
  } else if (kind === 'arrow') {
    drawArrow(ctx, px, py, px + pw, py + ph, strokeWidth)
  } else if (kind === 'marker') {
    ctx.globalAlpha = 0.4
    ctx.fillRect(px, py, pw, ph)
  }
  ctx.restore()
}

function drawArrow(ctx: OffscreenCanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  const headLen = width * 4
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

// ── PIXELATE / BLUR REGION ─────────────────────────────────
function applyPixelate(canvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D, op: PixelateOp) {
  const { x, y, width, height, mode, strength } = op.params
  const px = Math.round(x * canvas.width)
  const py = Math.round(y * canvas.height)
  const pw = Math.max(1, Math.round(width * canvas.width))
  const ph = Math.max(1, Math.round(height * canvas.height))

  if (mode === 'pixelate') {
    const block = Math.max(2, Math.round(strength))
    const small = new OffscreenCanvas(Math.max(1, Math.round(pw / block)), Math.max(1, Math.round(ph / block)))
    const sctx = small.getContext('2d')!
    sctx.imageSmoothingEnabled = false
    sctx.drawImage(canvas, px, py, pw, ph, 0, 0, small.width, small.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, 0, 0, small.width, small.height, px, py, pw, ph)
    ctx.imageSmoothingEnabled = true
  } else {
    // pad the source sample so the blur doesn't sample transparent edges
    const pad = Math.ceil(strength)
    const region = new OffscreenCanvas(pw + pad * 2, ph + pad * 2)
    const rctx = region.getContext('2d')!
    rctx.drawImage(canvas, px - pad, py - pad, pw + pad * 2, ph + pad * 2, 0, 0, region.width, region.height)
    rctx.filter = `blur(${strength}px)`
    rctx.drawImage(region, 0, 0)
    ctx.drawImage(region, pad, pad, pw, ph, px, py, pw, ph)
  }
}
