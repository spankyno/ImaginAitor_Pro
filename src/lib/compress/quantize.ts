// ─────────────────────────────────────────────────────────────
// Cuantización a paleta (equivalente funcional a pngquant, licencia propia).
//
//   1. Histograma de colores (RGB 5 bits + alfa 3 bits) sobre TODOS los píxeles.
//   2. Median-cut ponderado por población → paleta inicial.
//   3. Dos pasadas de refinado tipo k-means sobre los bins del histograma.
//   4. Mapeo a la paleta con caché de vecino más cercano y, opcionalmente,
//      difusión de error Floyd–Steinberg serpentina.
//
// Todo con arrays tipados (sin un objeto por píxel): ~0,1 s por megapíxel y
// memoria acotada, incluso con imágenes de 50 MP.
//
// libimagequant (pngquant) es GPL-3; por eso NO se usa aquí.
// ─────────────────────────────────────────────────────────────

const BINS = 1 << 18 // 5+5+5 bits de color + 3 bits de alfa
const CH_W = [0.8, 1.0, 0.5, 1.0] // peso perceptual aproximado de R, G, B, A

// Alfa: 0 se trata aparte (entrada transparente reservada); 255 tiene bin propio
// para que los píxeles opacos nunca se mezclen con casi-opacos.
const alphaBin3 = (a: number) => (a === 255 ? 7 : Math.min(6, a >> 5))
const alphaBin4 = (a: number) => (a === 255 ? 15 : Math.min(14, a >> 4))

export interface QuantizeOptions {
  /** Intensidad de la difusión de error (0..1). */
  strength?: number
  colors: number // 2..256
  dither: boolean
}

export function quantizeRGBA(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  { colors, dither, strength = 0.5 }: QuantizeOptions,
): Uint8ClampedArray {
  const total = width * height
  const maxColors = Math.max(2, Math.min(256, Math.round(colors)))

  // ── 1. Histograma ──
  const counts = new Uint32Array(BINS)
  const sums = new Float64Array(BINS * 4)
  let hasTransparent = false
  for (let p = 0, i = 0; p < total; p++, i += 4) {
    const a = src[i + 3]
    if (a === 0) { hasTransparent = true; continue }
    const k = (alphaBin3(a) << 15) | ((src[i] >> 3) << 10) | ((src[i + 1] >> 3) << 5) | (src[i + 2] >> 3)
    counts[k]++
    const s = k * 4
    sums[s] += src[i]; sums[s + 1] += src[i + 1]; sums[s + 2] += src[i + 2]; sums[s + 3] += a
  }

  // Compactar bins no vacíos: color medio + peso.
  let n = 0
  for (let k = 0; k < BINS; k++) if (counts[k]) n++
  const col = new Float32Array(n * 4)
  const wgt = new Float64Array(n)
  for (let k = 0, j = 0; k < BINS; k++) {
    const c = counts[k]
    if (!c) continue
    wgt[j] = c
    col[j * 4] = sums[k * 4] / c; col[j * 4 + 1] = sums[k * 4 + 1] / c
    col[j * 4 + 2] = sums[k * 4 + 2] / c; col[j * 4 + 3] = sums[k * 4 + 3] / c
    j++
  }

  const K = Math.max(1, maxColors - (hasTransparent ? 1 : 0))

  // ── 2. Median-cut ──
  let boxes: Int32Array[] = [Int32Array.from({ length: n }, (_, i) => i)]
  const boxStats = (idx: Int32Array) => {
    const lo = [255, 255, 255, 255], hi = [0, 0, 0, 0]
    let pop = 0
    for (let t = 0; t < idx.length; t++) {
      const j = idx[t]; pop += wgt[j]
      for (let c = 0; c < 4; c++) { const v = col[j * 4 + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v }
    }
    let best = 0, bestRange = -1
    for (let c = 0; c < 4; c++) { const r = (hi[c] - lo[c]) * CH_W[c]; if (r > bestRange) { bestRange = r; best = c } }
    return { pop, channel: best, range: bestRange }
  }
  const scores = [boxStats(boxes[0])]
  while (boxes.length < K) {
    let pick = -1, pickScore = 0
    for (let b = 0; b < boxes.length; b++) {
      if (boxes[b].length < 2 || scores[b].range <= 0) continue
      const sc = scores[b].pop * scores[b].range
      if (sc > pickScore) { pickScore = sc; pick = b }
    }
    if (pick < 0) break // no hay nada más que dividir (la imagen ya tiene < K colores)
    const idx = boxes[pick], ch = scores[pick].channel
    const sorted = Array.from(idx).sort((a, b) => col[a * 4 + ch] - col[b * 4 + ch])
    let acc = 0, cut = 1
    const half = scores[pick].pop / 2
    for (let t = 0; t < sorted.length - 1; t++) { acc += wgt[sorted[t]]; cut = t + 1; if (acc >= half) break }
    const left = Int32Array.from(sorted.slice(0, cut)), right = Int32Array.from(sorted.slice(cut))
    boxes[pick] = left; scores[pick] = boxStats(left)
    boxes.push(right); scores.push(boxStats(right))
  }

  // Paleta inicial: media ponderada de cada caja.
  const pal = new Float32Array(boxes.length * 4)
  for (let b = 0; b < boxes.length; b++) {
    let w = 0; const acc = [0, 0, 0, 0]
    for (const j of boxes[b]) { w += wgt[j]; for (let c = 0; c < 4; c++) acc[c] += col[j * 4 + c] * wgt[j] }
    for (let c = 0; c < 4; c++) pal[b * 4 + c] = acc[c] / w
  }
  const P = boxes.length

  // ── 3. Refinado k-means sobre los bins ──
  const nearestIn = (r: number, g: number, b: number, a: number): number => {
    let best = 0, bd = Infinity
    for (let p = 0; p < P; p++) {
      const dr = (r - pal[p * 4]) * CH_W[0], dg = (g - pal[p * 4 + 1]) * CH_W[1]
      const db = (b - pal[p * 4 + 2]) * CH_W[2], da = (a - pal[p * 4 + 3]) * CH_W[3]
      const d = dr * dr + dg * dg + db * db + da * da
      if (d < bd) { bd = d; best = p }
    }
    return best
  }
  for (let iter = 0; iter < 2 && P > 1; iter++) {
    const acc = new Float64Array(P * 4), w = new Float64Array(P)
    for (let j = 0; j < n; j++) {
      const p = nearestIn(col[j * 4], col[j * 4 + 1], col[j * 4 + 2], col[j * 4 + 3])
      w[p] += wgt[j]
      for (let c = 0; c < 4; c++) acc[p * 4 + c] += col[j * 4 + c] * wgt[j]
    }
    for (let p = 0; p < P; p++) if (w[p] > 0) for (let c = 0; c < 4; c++) pal[p * 4 + c] = acc[p * 4 + c] / w[p]
  }

  // Paleta final en bytes. Si hay transparencia, índice 0 = (0,0,0,0).
  const off = hasTransparent ? 1 : 0
  const palette = new Uint8ClampedArray((P + off) * 4)
  for (let p = 0; p < P; p++) for (let c = 0; c < 4; c++) palette[(p + off) * 4 + c] = Math.round(pal[p * 4 + c])

  // ── 4. Mapeo (con caché de vecino más cercano) ──
  const cache = new Int16Array(1 << 22).fill(-1) // 6+6+6 bits color + 4 bits alfa
  const lookup = (r: number, g: number, b: number, a: number): number => {
    const key = (alphaBin4(a) << 18) | ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2)
    let v = cache[key]
    if (v < 0) { v = nearestIn(r, g, b, a) + off; cache[key] = v }
    return v
  }

  const out = new Uint8ClampedArray(src.length)
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
  // Dos filas de error (3 canales), con 1 píxel de margen a cada lado.
  let errCur = new Float32Array((width + 2) * 3), errNext = new Float32Array((width + 2) * 3)

  for (let y = 0; y < height; y++) {
    const rtl = dither && (y & 1) === 1
    errNext.fill(0)
    for (let s = 0; s < width; s++) {
      const x = rtl ? width - 1 - s : s
      const dir = rtl ? -1 : 1
      const i = (y * width + x) * 4
      const a = src[i + 3]
      if (a === 0) { out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0; continue }
      const e = (x + 1) * 3
      const r = clamp(src[i] + (dither ? errCur[e] : 0))
      const g = clamp(src[i + 1] + (dither ? errCur[e + 1] : 0))
      const b = clamp(src[i + 2] + (dither ? errCur[e + 2] : 0))
      const pi = lookup(r | 0, g | 0, b | 0, a) * 4
      const pr = palette[pi], pg = palette[pi + 1], pb = palette[pi + 2]
      out[i] = pr; out[i + 1] = pg; out[i + 2] = pb; out[i + 3] = palette[pi + 3]
      if (dither) {
        const er = (r - pr) * strength, eg = (g - pg) * strength, eb = (b - pb) * strength
        const f = (x + 1 + dir) * 3, d = (x + 1 - dir) * 3
        errCur[f] += er * 0.4375; errCur[f + 1] += eg * 0.4375; errCur[f + 2] += eb * 0.4375 // 7/16
        errNext[d] += er * 0.1875; errNext[d + 1] += eg * 0.1875; errNext[d + 2] += eb * 0.1875 // 3/16
        errNext[e] += er * 0.3125; errNext[e + 1] += eg * 0.3125; errNext[e + 2] += eb * 0.3125 // 5/16
        errNext[f] += er * 0.0625; errNext[f + 1] += eg * 0.0625; errNext[f + 2] += eb * 0.0625 // 1/16
      }
    }
    const t = errCur; errCur = errNext; errNext = t
  }
  return out
}
