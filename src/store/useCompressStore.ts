import { create } from 'zustand'
import { toast } from 'sonner'
import { zipSync } from 'fflate'
import { useEditorStore } from './useEditorStore'
import { cancelCompression, compressInWorker, isAbortError } from '../lib/compressClient'
import { sizeBeforeOp } from '../lib/geometry'
import { classifyError } from '../lib/errors'
import {
  DEFAULT_SETTINGS, FORMATS, formatBytes,
  type CompressFormat, type CompressMode, type CompressSettings, type QualityFormat,
} from '../lib/compress/types'

const STORAGE_KEY = 'imaginaitor:compress'
/** Por encima de estos megapíxeles no se recomprime solo en cada cambio: hay que pulsar "Comprimir". */
export const AUTO_MAX_PIXELS = 6_000_000
const DEBOUNCE_MS = 300

export interface ActiveResult {
  docId: string
  blob: Blob
  /** URL de la imagen que se muestra (el propio resultado, o un PNG decodificado para JXL). */
  previewUrl: string
  size: number
  width: number
  height: number
  format: CompressFormat
  mode: CompressMode
  hasAlpha: boolean
  ms: number
}

type Status = 'idle' | 'working' | 'done' | 'stale' | 'error'

interface CompressState {
  settings: CompressSettings
  status: Status
  result: ActiveResult | null
  error: string | null
  batch: { done: number; total: number } | null

  patch: (p: Partial<CompressSettings>) => void
  setQuality: (f: QualityFormat, q: number) => void
  /** Recomprime la imagen activa (debounced). `force` salta el límite de tamaño automático. */
  schedule: (docId: string, opts?: { force?: boolean }) => void
  cancel: () => void
  clear: () => void
  download: () => void
  runBatch: () => Promise<void>
  cancelBatch: () => void
}

function loadSettings(): CompressSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { ...DEFAULT_SETTINGS, ...raw, quality: { ...DEFAULT_SETTINGS.quality, ...raw.quality } }
  } catch { return DEFAULT_SETTINGS }
}

function saveFile(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'imagen'

let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
let batchCancelled = false

function revoke(r: ActiveResult | null) { if (r) URL.revokeObjectURL(r.previewUrl) }

export const useCompressStore = create<CompressState>((set, get) => ({
  settings: loadSettings(),
  status: 'idle',
  result: null,
  error: null,
  batch: null,

  patch: (p) => set((s) => {
    const settings = { ...s.settings, ...p }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* modo privado / cuota */ }
    return { settings }
  }),

  setQuality: (f, q) => get().patch({ quality: { ...get().settings.quality, [f]: q } }),

  schedule: (docId, opts) => {
    if (get().batch) return // un lote en curso manda: no le quitamos el worker
    const my = ++generation
    clearTimeout(timer)
    const ds = useEditorStore.getState().docs[docId]
    if (!ds) return

    const out = sizeBeforeOp(ds.doc.source, ds.doc.ops, null)
    if (!opts?.force && out.width * out.height > AUTO_MAX_PIXELS) {
      cancelCompression()
      set({ status: 'stale', error: null })
      return
    }

    set({ status: 'working', error: null })
    timer = setTimeout(async () => {
      const cur = useEditorStore.getState().docs[docId]
      if (!cur || my !== generation) return
      try {
        const res = await compressInWorker(cur.doc.source.bitmap, cur.doc.ops, get().settings, cur.doc.source.mimeType)
        if (my !== generation) return // llegó tarde: ya hay una petición más nueva
        const previewUrl = URL.createObjectURL(res.previewBlob ?? res.blob)
        const prev = get().result
        set({
          status: 'done', error: null,
          result: { docId, blob: res.blob, previewUrl, size: res.blob.size, width: res.width, height: res.height, format: res.format, mode: res.mode, hasAlpha: res.hasAlpha, ms: res.ms },
        })
        revoke(prev)
      } catch (e) {
        if (isAbortError(e) || my !== generation) return
        console.error('Compression failed', e)
        const c = classifyError(e)
        set({ status: 'error', error: c.description })
        toast.error(c.title, { description: c.description })
      }
    }, opts?.force ? 0 : DEBOUNCE_MS)
  },

  cancel: () => {
    generation++
    clearTimeout(timer)
    cancelCompression()
    // 'stale' = no hay un resultado al día; el panel ofrece el botón para relanzar.
    set({ status: 'stale' })
  },

  // Al salir de la herramienta: cancelar trabajo en curso y soltar los blobs (no dejar memoria retenida).
  clear: () => {
    generation++
    clearTimeout(timer)
    cancelCompression()
    revoke(get().result)
    set({ status: 'idle', result: null, error: null })
  },

  download: () => {
    const r = get().result
    const ds = r ? useEditorStore.getState().docs[r.docId] : undefined
    if (!r || !ds) return
    saveFile(r.blob, `${baseName(ds.doc.source.name)}-comprimida.${FORMATS[r.format].ext}`)
    toast.success('Imagen comprimida descargada', { description: `${formatBytes(ds.doc.source.originalSize)} → ${formatBytes(r.size)}` })
  },

  cancelBatch: () => { batchCancelled = true; cancelCompression() },

  runBatch: async () => {
    const editor = useEditorStore.getState()
    const ids = editor.order.filter((id) => editor.docs[id])
    if (ids.length === 0 || get().batch) return
    // El trabajo del panel (imagen activa) cede el worker al lote.
    generation++
    clearTimeout(timer)
    batchCancelled = false
    const settings = get().settings
    const files: Record<string, Uint8Array> = {}
    const used = new Set<string>()
    let before = 0, after = 0, failed = 0
    set({ batch: { done: 0, total: ids.length }, status: 'idle' })

    for (let i = 0; i < ids.length; i++) {
      if (batchCancelled) break
      const ds = useEditorStore.getState().docs[ids[i]]
      if (!ds) continue
      try {
        const res = await compressInWorker(ds.doc.source.bitmap, ds.doc.ops, settings, ds.doc.source.mimeType)
        const ext = FORMATS[res.format].ext
        let name = `${baseName(ds.doc.source.name)}.${ext}`
        for (let n = 2; used.has(name.toLowerCase()); n++) name = `${baseName(ds.doc.source.name)}-${n}.${ext}`
        used.add(name.toLowerCase())
        files[name] = new Uint8Array(await res.blob.arrayBuffer())
        before += ds.doc.source.originalSize
        after += res.blob.size
      } catch (e) {
        if (isAbortError(e)) { batchCancelled = true; break }
        failed++
        console.error('Batch item failed', ds.doc.source.name, e)
      }
      set({ batch: { done: i + 1, total: ids.length } })
    }

    set({ batch: null })
    const count = Object.keys(files).length
    if (batchCancelled) { toast.info('Compresión por lotes cancelada'); return }
    if (count === 0) { toast.error('No se pudo comprimir ninguna imagen'); return }
    // level: 0 → solo empaquetar: los formatos de imagen ya están comprimidos, deflate no ganaría nada.
    const zip = zipSync(files, { level: 0 })
    saveFile(new Blob([zip as BlobPart], { type: 'application/zip' }), 'imaginaitor-comprimidas.zip')
    const saved = before > 0 ? Math.round((1 - after / before) * 100) : 0
    toast.success(`${count} imágenes comprimidas`, {
      description: `${formatBytes(before)} → ${formatBytes(after)} (${saved >= 0 ? '−' : '+'}${Math.abs(saved)} %)${failed ? ` · ${failed} con error` : ''}`,
    })
  },
}))
