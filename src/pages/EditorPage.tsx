import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useEditorStore } from '../store/useEditorStore'
import { TopBar } from '../components/Layout/TopBar'
import { Sidebar } from '../components/Layout/Sidebar'
import { EditorCanvas } from '../components/Canvas/EditorCanvas'
import { Dropzone } from '../components/Upload/Dropzone'
import { Footer } from '../components/Layout/Footer'

export default function EditorPage() {
  const activeId = useEditorStore((s) => s.activeId)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  useEffect(() => { document.title = 'ImaginAitor_Pro — Editor de Imágenes Online' }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeId) return
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable
      if (isEditable) return // let the browser's native undo handle text fields
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
      <Footer variant="compact" />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}
