import { useCallback, useEffect, useRef, useState } from 'react'
import { UploadCloud, Link as LinkIcon, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore } from '../../store/useEditorStore'
import { loadImageFromUrl } from '../../lib/exif'

export function Dropzone({ compact = false }: { compact?: boolean }) {
  const addFiles = useEditorStore((s) => s.addFiles)
  const [dragging, setDragging] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) {
      toast.error('No se encontraron imágenes válidas')
      return
    }
    await addFiles(arr)
    toast.success(`${arr.length} imagen${arr.length > 1 ? 'es' : ''} cargada${arr.length > 1 ? 's' : ''}`)
  }, [addFiles])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile()
          if (f) files.push(f)
        }
      }
      if (files.length) handleFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFiles])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const submitUrl = async () => {
    if (!url.trim()) return
    try {
      const file = await loadImageFromUrl(url.trim())
      await handleFiles([file])
      setUrl('')
      setUrlOpen(false)
    } catch (e) {
      toast.error('No se pudo cargar la imagen (¿CORS?)')
    }
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-panel-2 px-3 py-2 text-sm text-text-primary hover:border-accent/60 transition-colors"
        >
          <ImagePlus size={16} /> Añadir imágenes
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*" hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-border-subtle'}`}
    >
      <div className="rounded-full bg-bg-panel-2 p-5">
        <UploadCloud size={36} className="text-accent" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-text-primary">Arrastra tus imágenes aquí</p>
        <p className="text-sm text-text-muted">o pega con Ctrl+V · soporta varios archivos a la vez</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">
          <ImagePlus size={16} /> Seleccionar archivos
        </button>
        <button onClick={() => setUrlOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-primary hover:border-accent/60 transition-colors">
          <LinkIcon size={16} /> Desde URL
        </button>
      </div>
      {urlOpen && (
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitUrl()}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="w-72 rounded-lg border border-border-subtle bg-bg-panel-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <button onClick={submitUrl} className="rounded-lg bg-accent px-3 py-2 text-sm text-white">Cargar</button>
        </div>
      )}
      <input ref={inputRef} type="file" multiple accept="image/*" hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
    </div>
  )
}
