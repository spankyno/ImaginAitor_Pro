import { create } from 'zustand'

export type ToolId = 'crop' | 'resize' | 'transform' | 'adjust' | 'filters' | 'text' | 'shapes' | 'pixelate' | 'history'

interface UiState {
  activeTool: ToolId
  setActiveTool: (t: ToolId) => void
  /** id of the currently selected text/shape op on the Konva overlay (multi-layer selection) */
  selectedOpId: string | null
  setSelectedOpId: (id: string | null) => void
}

/**
 * Tiny, separate store for pure UI/interaction state (which tool tab is
 * active, which canvas layer is selected). Kept apart from useEditorStore
 * so that selecting a tool or a layer never touches the document/history
 * state machine that drives re-rendering.
 */
export const useUiStore = create<UiState>((set) => ({
  activeTool: 'crop',
  setActiveTool: (t) => set({ activeTool: t, selectedOpId: null }),
  selectedOpId: null,
  setSelectedOpId: (id) => set({ selectedOpId: id }),
}))
