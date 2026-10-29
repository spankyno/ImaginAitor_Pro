import { create } from 'zustand'
import { toast } from 'sonner'
import { genId } from '../utils/id'
import { getRenderWorker, onWorkerCrash } from '../lib/workerClient'
import { requestThumbnail } from '../lib/thumbnailQueue'
import { classifyError, MAX_MEGAPIXELS, WARN_MEGAPIXELS } from '../lib/errors'
import type { EditOperation, ImageDocument, SourceImage } from '../types/pipeline'
import { readExifOrientation, bitmapFromFileRespectingExif } from '../lib/exif'

interface HistoryEntry {
  ops: EditOperation[]
}

interface DocState {
  doc: ImageDocument
  past: HistoryEntry[]
  future: HistoryEntry[]
  previewUrl: string | null
  previewWidth: number
  previewHeight: number
  isRendering: boolean
  renderError: string | null
  /** Small filmstrip thumbnail, produced by the dedicated thumbnail worker pool. */
  thumbUrl: string | null
}

interface EditorState {
  docs: Record<string, DocState>
  order: string[]
  activeId: string | null

  addFiles: (files: File[]) => Promise<void>
  setActive: (id: string) => void
  removeDoc: (id: string) => void

  addOp: (docId: string, op: EditOperation) => void
  updateOp: (docId: string, opId: string, patch: Partial<EditOperation['params']>) => void
  toggleOp: (docId: string, opId: string) => void
  removeOp: (docId: string, opId: string) => void
  reorderOps: (docId: string, fromIndex: number, toIndex: number) => void

  undo: (docId: string) => void
  redo: (docId: string) => void

  /** Debounced, cancellation-aware re-render. Safe to call on every keystroke/drag tick. */
  rerender: (docId: string, opts?: { immediate?: boolean }) => void
  applyPipelineToAll: (sourceDocId: string) => Promise<void>
}

// ── Render scheduling (module-level, not store state) ──────────────────
// Kept outside the Zustand state on purpose: bumping a generation counter
// or a debounce timer shouldn't itself trigger a React re-render.
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const renderGeneration = new Map<string, number>()
const DEBOUNCE_MS = 90

function nextGeneration(docId: string) {
  const g = (renderGeneration.get(docId) ?? 0) + 1
  renderGeneration.set(docId, g)
  return g
}

async function performRender(docId: string, generation: number, get: () => EditorState, set: (fn: (s: EditorState) => Partial<EditorState>) => void) {
  const ds = get().docs[docId]
  if (!ds) return
  set((s) => ({ docs: { ...s.docs, [docId]: { ...s.docs[docId], isRendering: true, renderError: null } } }))

  try {
    const result = await getRenderWorker().render(ds.doc.source.bitmap, ds.doc.ops, generation)

    // A newer edit was made while this render was in flight — this result
    // is stale. Drop it silently instead of flashing an outdated preview.
    if (renderGeneration.get(docId) !== generation) return

    const url = URL.createObjectURL(result.blob)
    set((s) => {
      const prev = s.docs[docId]?.previewUrl
      if (prev) URL.revokeObjectURL(prev) // release the previous preview's memory immediately
      return {
        docs: {
          ...s.docs,
          [docId]: { ...s.docs[docId], previewUrl: url, previewWidth: result.width, previewHeight: result.height, isRendering: false, renderError: null },
        },
      }
    })
  } catch (e) {
    if (renderGeneration.get(docId) !== generation) return // stale error too
    const classified = classifyError(e)
    console.error('Render failed', e)
    toast.error(classified.title, { description: classified.description })
    set((s) => ({ docs: { ...s.docs, [docId]: { ...s.docs[docId], isRendering: false, renderError: classified.title } } }))
  }
}

export const useEditorStore = create<EditorState>((set, get) => {
  // Any uncaught worker crash surfaces here rather than hanging forever.
  onWorkerCrash(() => {
    toast.error('El procesador en segundo plano se reinició', {
      description: 'Una operación se interrumpió inesperadamente. Vuelve a intentar el último cambio.',
    })
  })

  const scheduleRerender: EditorState['rerender'] = (docId, opts) => {
    // Bump the generation immediately: any render already in flight for
    // this doc becomes stale right now, even before the debounce timer
    // below fires. This is what makes rapid slider scrubbing (20→25→30→38)
    // cheap — only the last value ever reaches the worker's result being
    // applied, and earlier in-flight results are ignored on arrival.
    const generation = nextGeneration(docId)

    const existingTimer = debounceTimers.get(docId)
    if (existingTimer) clearTimeout(existingTimer)

    const run = () => { debounceTimers.delete(docId); performRender(docId, generation, get, set) }
    if (opts?.immediate) run()
    else debounceTimers.set(docId, setTimeout(run, DEBOUNCE_MS))
  }

  return {
    docs: {},
    order: [],
    activeId: null,

    addFiles: async (files) => {
      for (const file of files) {
        try {
          const { bitmap, width, height } = await bitmapFromFileRespectingExif(file)
          const megapixels = (width * height) / 1_000_000
          if (megapixels > MAX_MEGAPIXELS) {
            bitmap.close()
            toast.error('Imagen demasiado grande', {
              description: `${file.name}: ${Math.round(megapixels)}MP supera el límite de ${MAX_MEGAPIXELS}MP soportado.`,
            })
            continue
          }
          if (megapixels > WARN_MEGAPIXELS) {
            toast.warning('Imagen muy grande', { description: `${file.name} tiene ${Math.round(megapixels)}MP — el editor puede ir más lento de lo habitual.` })
          }

          const source: SourceImage = {
            id: genId(), name: file.name || 'imagen.png', mimeType: file.type || 'image/png',
            originalSize: file.size, width, height, bitmap,
          }
          const doc: ImageDocument = { id: genId(), source, ops: [], createdAt: Date.now() }
          set((s) => ({
            docs: { ...s.docs, [doc.id]: { doc, past: [], future: [], previewUrl: null, previewWidth: width, previewHeight: height, isRendering: false, renderError: null, thumbUrl: null } },
            order: [...s.order, doc.id],
            activeId: s.activeId ?? doc.id,
          }))

          // Thumbnails stream in from their own dedicated worker pool —
          // cheap and fully decoupled from full-resolution preview
          // rendering, so a 300-image batch import never makes either one
          // wait behind the other.
          requestThumbnail(bitmap)
            .then((blob) => {
              const url = URL.createObjectURL(blob)
              set((s) => {
                const ds = s.docs[doc.id]
                if (!ds) { URL.revokeObjectURL(url); return {} } // removed while thumbnail was in flight
                if (ds.thumbUrl) URL.revokeObjectURL(ds.thumbUrl)
                return { docs: { ...s.docs, [doc.id]: { ...ds, thumbUrl: url } } }
              })
            })
            .catch((e) => console.error('Thumbnail failed', e))

          // Only the doc that actually becomes active needs a full
          // pipeline render right away; the rest render lazily the moment
          // the user selects them (see setActive below).
          if (get().activeId === doc.id) get().rerender(doc.id, { immediate: true })
        } catch (e) {
          const classified = classifyError(e)
          toast.error(`${file.name}: ${classified.title}`, { description: classified.description })
        }
      }
    },

    setActive: (id) => {
      set({ activeId: id })
      const ds = get().docs[id]
      if (ds && !ds.previewUrl && !ds.isRendering) get().rerender(id, { immediate: true })
    },

    removeDoc: (id) => set((s) => {
      const ds = s.docs[id]
      if (ds) {
        // Release the pristine source bitmap and both cached preview blob
        // URLs — without this, closing/switching images silently
        // accumulates raw pixel buffers for the lifetime of the tab.
        try { ds.doc.source.bitmap.close() } catch { /* already closed */ }
        if (ds.previewUrl) URL.revokeObjectURL(ds.previewUrl)
        if (ds.thumbUrl) URL.revokeObjectURL(ds.thumbUrl)
      }
      const t = debounceTimers.get(id)
      if (t) clearTimeout(t)
      debounceTimers.delete(id)
      renderGeneration.delete(id)
      const { [id]: _removed, ...rest } = s.docs
      const order = s.order.filter((o) => o !== id)
      return { docs: rest, order, activeId: s.activeId === id ? (order[0] ?? null) : s.activeId }
    }),

    addOp: (docId, op) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds) return {}
        return { docs: { ...s.docs, [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: [...ds.doc.ops, op] } } } }
      })
      get().rerender(docId, { immediate: true })
    },

    updateOp: (docId, opId, patch) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds) return {}
        const nextOps = ds.doc.ops.map((o) => (o.id === opId ? ({ ...o, params: { ...o.params, ...patch } } as EditOperation) : o))
        return { docs: { ...s.docs, [docId]: { ...ds, doc: { ...ds.doc, ops: nextOps } } } }
      })
      // Debounced: this is the hot path for slider dragging.
      get().rerender(docId)
    },

    toggleOp: (docId, opId) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds) return {}
        const nextOps = ds.doc.ops.map((o) => (o.id === opId ? { ...o, enabled: !o.enabled } : o))
        return { docs: { ...s.docs, [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: nextOps } } } }
      })
      get().rerender(docId, { immediate: true })
    },

    removeOp: (docId, opId) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds) return {}
        const nextOps = ds.doc.ops.filter((o) => o.id !== opId)
        return { docs: { ...s.docs, [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: nextOps } } } }
      })
      get().rerender(docId, { immediate: true })
    },

    reorderOps: (docId, fromIndex, toIndex) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds) return {}
        const ops = [...ds.doc.ops]
        const [moved] = ops.splice(fromIndex, 1)
        ops.splice(toIndex, 0, moved)
        return { docs: { ...s.docs, [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops } } } }
      })
      get().rerender(docId, { immediate: true })
    },

    undo: (docId) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds || ds.past.length === 0) return {}
        const previous = ds.past[ds.past.length - 1]
        return { docs: { ...s.docs, [docId]: { ...ds, past: ds.past.slice(0, -1), future: [{ ops: ds.doc.ops }, ...ds.future], doc: { ...ds.doc, ops: previous.ops } } } }
      })
      get().rerender(docId, { immediate: true })
    },

    redo: (docId) => {
      set((s) => {
        const ds = s.docs[docId]
        if (!ds || ds.future.length === 0) return {}
        const next = ds.future[0]
        return { docs: { ...s.docs, [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: ds.future.slice(1), doc: { ...ds.doc, ops: next.ops } } } }
      })
      get().rerender(docId, { immediate: true })
    },

    rerender: scheduleRerender,

    applyPipelineToAll: async (sourceDocId) => {
      const s = get()
      const sourceOps = s.docs[sourceDocId]?.doc.ops
      if (!sourceOps) return
      for (const id of s.order) {
        if (id === sourceDocId) continue
        set((st) => {
          const ds = st.docs[id]
          if (!ds) return {}
          const cloned = sourceOps.map((o) => ({ ...o, id: genId() }))
          return { docs: { ...st.docs, [id]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: cloned } } } }
        })
        get().rerender(id, { immediate: true })
      }
    },
  }
})

export const useActiveDoc = () => useEditorStore((s) => (s.activeId ? s.docs[s.activeId] : undefined))

export { readExifOrientation }
