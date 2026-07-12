import { create } from 'zustand'
import { genId } from '../utils/id'
import { renderWorker } from '../lib/workerClient'
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

  rerender: (docId: string) => Promise<void>
  applyPipelineToAll: (sourceDocId: string) => Promise<void>
}

async function renderPreview(state: EditorState, docId: string, get: () => EditorState, set: (fn: (s: EditorState) => Partial<EditorState>) => void) {
  const ds = get().docs[docId]
  if (!ds) return
  set((s) => ({ docs: { ...s.docs, [docId]: { ...s.docs[docId], isRendering: true } } }))
  try {
    const enabledOps = ds.doc.ops
    const result = await renderWorker.render(ds.doc.source.bitmap, enabledOps)
    const canvas = document.createElement('canvas')
    canvas.width = result.width
    canvas.height = result.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(result.bitmap, 0, 0)
    const url = canvas.toDataURL('image/png')
    set((s) => {
      if (s.docs[docId]?.previewUrl) URL.revokeObjectURL(s.docs[docId].previewUrl!)
      return {
        docs: {
          ...s.docs,
          [docId]: { ...s.docs[docId], previewUrl: url, previewWidth: result.width, previewHeight: result.height, isRendering: false },
        },
      }
    })
  } catch (e) {
    console.error('Render failed', e)
    set((s) => ({ docs: { ...s.docs, [docId]: { ...s.docs[docId], isRendering: false } } }))
  }
  void state
}

export const useEditorStore = create<EditorState>((set, get) => ({
  docs: {},
  order: [],
  activeId: null,

  addFiles: async (files) => {
    for (const file of files) {
      const { bitmap, width, height } = await bitmapFromFileRespectingExif(file)
      const source: SourceImage = {
        id: genId(),
        name: file.name || 'imagen.png',
        mimeType: file.type || 'image/png',
        originalSize: file.size,
        width,
        height,
        bitmap,
      }
      const doc: ImageDocument = { id: genId(), source, ops: [], createdAt: Date.now() }
      set((s) => ({
        docs: { ...s.docs, [doc.id]: { doc, past: [], future: [], previewUrl: null, previewWidth: width, previewHeight: height, isRendering: false } },
        order: [...s.order, doc.id],
        activeId: s.activeId ?? doc.id,
      }))
      get().rerender(doc.id)
    }
  },

  setActive: (id) => set({ activeId: id }),

  removeDoc: (id) => set((s) => {
    const { [id]: _removed, ...rest } = s.docs
    const order = s.order.filter((o) => o !== id)
    return { docs: rest, order, activeId: s.activeId === id ? (order[0] ?? null) : s.activeId }
  }),

  addOp: (docId, op) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds) return {}
      const nextOps = [...ds.doc.ops, op]
      return {
        docs: {
          ...s.docs,
          [docId]: {
            ...ds,
            past: [...ds.past, { ops: ds.doc.ops }],
            future: [],
            doc: { ...ds.doc, ops: nextOps },
          },
        },
      }
    })
    get().rerender(docId)
  },

  updateOp: (docId, opId, patch) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds) return {}
      const nextOps = ds.doc.ops.map((o) => (o.id === opId ? ({ ...o, params: { ...o.params, ...patch } } as EditOperation) : o))
      return { docs: { ...s.docs, [docId]: { ...ds, doc: { ...ds.doc, ops: nextOps } } } }
    })
    get().rerender(docId)
  },

  toggleOp: (docId, opId) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds) return {}
      const nextOps = ds.doc.ops.map((o) => (o.id === opId ? { ...o, enabled: !o.enabled } : o))
      return {
        docs: {
          ...s.docs,
          [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: nextOps } },
        },
      }
    })
    get().rerender(docId)
  },

  removeOp: (docId, opId) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds) return {}
      const nextOps = ds.doc.ops.filter((o) => o.id !== opId)
      return {
        docs: {
          ...s.docs,
          [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: nextOps } },
        },
      }
    })
    get().rerender(docId)
  },

  reorderOps: (docId, fromIndex, toIndex) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds) return {}
      const ops = [...ds.doc.ops]
      const [moved] = ops.splice(fromIndex, 1)
      ops.splice(toIndex, 0, moved)
      return {
        docs: {
          ...s.docs,
          [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops } },
        },
      }
    })
    get().rerender(docId)
  },

  undo: (docId) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds || ds.past.length === 0) return {}
      const previous = ds.past[ds.past.length - 1]
      const newPast = ds.past.slice(0, -1)
      return {
        docs: {
          ...s.docs,
          [docId]: { ...ds, past: newPast, future: [{ ops: ds.doc.ops }, ...ds.future], doc: { ...ds.doc, ops: previous.ops } },
        },
      }
    })
    get().rerender(docId)
  },

  redo: (docId) => {
    set((s) => {
      const ds = s.docs[docId]
      if (!ds || ds.future.length === 0) return {}
      const next = ds.future[0]
      const newFuture = ds.future.slice(1)
      return {
        docs: {
          ...s.docs,
          [docId]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: newFuture, doc: { ...ds.doc, ops: next.ops } },
        },
      }
    })
    get().rerender(docId)
  },

  rerender: async (docId) => {
    await renderPreview(get(), docId, get, set)
  },

  applyPipelineToAll: async (sourceDocId) => {
    const s = get()
    const sourceOps = s.docs[sourceDocId]?.doc.ops
    if (!sourceOps) return
    for (const id of s.order) {
      if (id === sourceDocId) continue
      set((st) => {
        const ds = st.docs[id]
        if (!ds) return {}
        // clone ops with fresh ids so each doc's history stays independent
        const cloned = sourceOps.map((o) => ({ ...o, id: genId() }))
        return { docs: { ...st.docs, [id]: { ...ds, past: [...ds.past, { ops: ds.doc.ops }], future: [], doc: { ...ds.doc, ops: cloned } } } }
      })
      await get().rerender(id)
    }
  },
}))

export const useActiveDoc = () => useEditorStore((s) => (s.activeId ? s.docs[s.activeId] : undefined))

// re-export for convenience where EXIF orientation reading alone is needed
export { readExifOrientation }
