import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useEditorStore } from './store/useEditorStore'
import { TopBar } from './components/Layout/TopBar'
import { Sidebar } from './components/Layout/Sidebar'
import { EditorCanvas } from './components/Canvas/EditorCanvas'
import { Dropzone } from './components/Upload/Dropzone'

export default function App() {
  const activeId = useEditorStore((s) => s.activeId)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeId) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(activeId) }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(activeId) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, undo, redo])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg-base text-text-primary">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {activeId ? (
          <>
            <Sidebar docId={activeId} />
            <div className="flex-1 overflow-hidden">
              <EditorCanvas />
            </div>
          </>
        ) : (
          <div className="flex-1 p-10">
            <Dropzone />
          </div>
        )}
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}
