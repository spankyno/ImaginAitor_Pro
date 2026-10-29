import { useEffect } from 'react'
import { Loader2, Download, Archive, X, AlertTriangle, Info, RefreshCw } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { AUTO_MAX_PIXELS, useCompressStore } from '../../store/useCompressStore'
import { sizeBeforeOp } from '../../lib/geometry'
import {
  FORMATS, FORMAT_ORDER, effectiveMode, formatBytes, resolveFormat,
  type CompressEffort, type CompressFormat,
} from '../../lib/compress/types'
import { Slider } from './Slider'

const EFFORTS: { id: CompressEffort; label: string }[] = [
  { id: 'fast', label: 'Rápido' },
  { id: 'balanced', label: 'Equilibrado' },
  { id: 'max', label: 'Máximo' },
]

const seg = (active: boolean, disabled = false) =>
  `rounded-lg border px-2 py-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
    disabled ? 'cursor-not-allowed border-border-subtle text-text-muted/40'
    : active ? 'border-accent bg-accent/10 text-accent'
    : 'border-border-subtle text-text-muted hover:text-text-primary'}`

export function CompressPanel({ docId }: { docId: string }) {
  const ds = useEditorStore((s) => s.docs[docId])
  const imageCount = useEditorStore((s) => s.order.length)

  const settings = useCompressStore((s) => s.settings)
  const status = useCompressStore((s) => s.status)
  const result = useCompressStore((s) => s.result)
  const error = useCompressStore((s) => s.error)
  const batch = useCompressStore((s) => s.batch)
  const { patch, setQuality, schedule, cancel, clear, download, runBatch, cancelBatch } = useCompressStore.getState()

  // Recomprimir al cambiar de imagen, de ajustes o de pipeline; soltar todo al salir de la herramienta.
  const ops = ds?.doc.ops
  useEffect(() => { schedule(docId) }, [docId, ops, settings, schedule])
  useEffect(() => () => clear(), [clear])

  if (!ds) return null

  const mime = ds.doc.source.mimeType
  const format = resolveFormat(settings.target, mime)
  const sourceFormat = resolveFormat('auto', mime)
  const mode = effectiveMode(format, settings.mode)
  const lossy = mode === 'lossy'
  const canLossless = FORMATS[format].supportsLossless
  const out = sizeBeforeOp(ds.doc.source, ds.doc.ops, null)
  const megapixels = (out.width * out.height) / 1e6
  const original = ds.doc.source.originalSize
  const fresh = result && result.docId === docId && status !== 'stale' ? result : null
  const working = status === 'working'
  const busy = !!batch
  const pct = fresh ? (1 - fresh.size / original) * 100 : 0
  const delta = pct >= 99 && pct < 100 ? pct.toFixed(1) : String(Math.round(pct))
  const bigger = fresh ? fresh.size >= original : false

  return (
    <div className="flex flex-col gap-4">
      {/* ── Modo ── */}
      <div>
        <p className="mb-1.5 text-xs text-text-muted">Tipo de compresión</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy || !canLossless}
            onClick={() => patch({ mode: 'lossless' })}
            aria-pressed={mode === 'lossless'}
            title={canLossless ? undefined : 'JPEG no admite compresión sin pérdida'}
            className={seg(mode === 'lossless', !canLossless)}
          >
            Sin pérdida
          </button>
          <button disabled={busy} onClick={() => patch({ mode: 'lossy' })} aria-pressed={mode === 'lossy'} className={seg(mode === 'lossy')}>
            Con pérdida
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
          {lossy
            ? 'Descarta detalle poco visible a cambio de un archivo mucho menor.'
            : 'Cada píxel se conserva exactamente; solo se empaqueta mejor.'}
        </p>
      </div>

      {/* ── Formato de salida ── */}
      <div>
        <p className="mb-1.5 text-xs text-text-muted">Formato de salida</p>
        <button disabled={busy} onClick={() => patch({ target: 'auto' })} aria-pressed={settings.target === 'auto'} className={`${seg(settings.target === 'auto')} mb-2 w-full`}>
          Mismo que el original ({FORMATS[sourceFormat].label})
        </button>
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Formato de salida">
          {FORMAT_ORDER.map((f: CompressFormat) => (
            <button key={f} disabled={busy} onClick={() => patch({ target: f })} aria-pressed={settings.target === f}
              className={`${seg(settings.target === f)} !px-0 text-[11px] uppercase`}>
              {f === 'jpeg' ? 'JPG' : f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Controles específicos del formato ── */}
      {lossy && format !== 'png' && (
        <Slider label="Calidad" min={1} max={100} value={settings.quality[format]} onChange={(v) => setQuality(format, v)} />
      )}
      {lossy && format === 'png' && (
        <>
          <Slider label="Colores de la paleta" min={2} max={256} value={settings.pngColors} onChange={(v) => patch({ pngColors: v })} />
          <label className="flex items-start gap-2 text-xs text-text-muted">
            <input type="checkbox" className="mt-0.5" checked={settings.pngDither} onChange={(e) => patch({ pngDither: e.target.checked })} />
            <span>Tramado — suaviza degradados y evita bandas, pero pesa más.</span>
          </label>
        </>
      )}
      {lossy && (format === 'jpeg' || format === 'avif') && (
        <label className="flex items-start gap-2 text-xs text-text-muted">
          <input type="checkbox" className="mt-0.5" checked={settings.chroma444} onChange={(e) => patch({ chroma444: e.target.checked })} />
          <span>Color nítido (4:4:4) — mejor para texto y capturas; pesa más.</span>
        </label>
      )}
      {(format === 'jpeg' || (format === 'jxl' && lossy)) && (
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={settings.progressive} onChange={(e) => patch({ progressive: e.target.checked })} />
          Carga progresiva
        </label>
      )}
      {!FORMATS[format].supportsAlpha && fresh?.hasAlpha && (
        <label className="flex items-center justify-between gap-2 text-xs text-text-muted">
          <span>{FORMATS[format].label} no admite transparencia. Fondo:</span>
          <input type="color" aria-label="Color de fondo" value={settings.background} onChange={(e) => patch({ background: e.target.value })} className="h-6 w-10 cursor-pointer rounded border border-border-subtle bg-transparent" />
        </label>
      )}

      {/* ── Esfuerzo ── */}
      <div>
        <p className="mb-1.5 text-xs text-text-muted">Esfuerzo de compresión</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Esfuerzo de compresión">
          {EFFORTS.map((e) => (
            <button key={e.id} disabled={busy} onClick={() => patch({ effort: e.id })} aria-pressed={settings.effort === e.id} className={`${seg(settings.effort === e.id)} !px-1 text-[11px]`}>
              {e.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-text-muted">Más esfuerzo = archivo algo menor, pero tarda más.</p>
      </div>

      {/* ── Resultado ── */}
      <div className="rounded-lg bg-bg-panel-2 px-3 py-3 text-xs" aria-live="polite">
        {working && (
          <div className="flex items-center justify-between gap-2 text-text-muted">
            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-accent" /> Comprimiendo…</span>
            <button onClick={cancel} className="flex items-center gap-1 rounded text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><X size={12} /> Cancelar</button>
          </div>
        )}
        {!working && status === 'stale' && (
          <div className="flex flex-col gap-2">
            <p className="text-text-muted">
              {megapixels * 1e6 > AUTO_MAX_PIXELS
                ? `${megapixels.toFixed(1)} MP: para no saturar el equipo, esta imagen no se recomprime sola en cada cambio.`
                : 'Compresión cancelada.'}
            </p>
            <button onClick={() => schedule(docId, { force: true })} disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-accent py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <RefreshCw size={13} /> Comprimir ahora
            </button>
          </div>
        )}
        {!working && status === 'error' && <p role="alert" className="text-red-400">{error ?? 'No se pudo comprimir la imagen.'}</p>}
        {!working && fresh && (
          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-text-muted">Original</p>
                <p className="tabular-nums text-text-primary">{formatBytes(original)}</p>
              </div>
              <div className="text-right">
                <p className="text-text-muted">Comprimida</p>
                <p className="text-sm font-medium tabular-nums text-text-primary">{formatBytes(fresh.size)}</p>
              </div>
            </div>
            <p className={`rounded-md px-2 py-1 text-center font-medium tabular-nums ${bigger ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
              {bigger ? `+${Math.abs(Number(delta))} % más pesada que el original` : `−${delta} %`}
            </p>
            <p className="text-[11px] text-text-muted tabular-nums">
              {fresh.width} × {fresh.height} px · {FORMATS[fresh.format].label} {fresh.mode === 'lossless' ? 'sin pérdida' : 'con pérdida'} · {(fresh.ms / 1000).toFixed(1)} s
            </p>
          </div>
        )}
      </div>

      {/* ── Avisos contextuales ── */}
      <div className="flex flex-col gap-2 text-[11px] leading-snug">
        {bigger && (
          <p className="flex gap-2 text-amber-300"><AlertTriangle size={13} className="mt-0.5 shrink-0" />
            El resultado no es menor que el original. Prueba "Con pérdida", otro formato o un esfuerzo mayor.</p>
        )}
        {format === 'jpeg' && settings.mode === 'lossless' && (
          <p className="flex gap-2 text-text-muted"><Info size={13} className="mt-0.5 shrink-0" />
            JPEG no tiene modo sin pérdida: recodificarlo siempre cambia píxeles. Para conservarlos exactos elige PNG, WebP, AVIF o JXL.</p>
        )}
        {format === 'jxl' && (
          <p className="flex gap-2 text-text-muted"><Info size={13} className="mt-0.5 shrink-0" />
            JPEG XL aún no se abre en todos los navegadores (Safari sí). Ideal para archivar; para web, mejor WebP o AVIF.</p>
        )}
        {(format === 'avif' || format === 'jxl') && (megapixels > 4 || settings.effort === 'max') && (
          <p className="flex gap-2 text-text-muted"><Info size={13} className="mt-0.5 shrink-0" />
            {FORMATS[format].label} es el más lento de codificar; con imágenes grandes o esfuerzo máximo puede tardar bastante.</p>
        )}
        {(out.width > 2048 || out.height > 2048) && (
          <p className="flex gap-2 text-text-muted"><Info size={13} className="mt-0.5 shrink-0" />
            El comparador "Antes / Después" usa una referencia reducida a 2048 px; para juzgar el detalle fino usa zoom 1:1 sin comparar.</p>
        )}
        <p className="flex gap-2 text-text-muted"><Info size={13} className="mt-0.5 shrink-0" />
          Al comprimir se eliminan los metadatos (EXIF, GPS) y el perfil de color; se aplica la orientación y se asume sRGB.</p>
      </div>

      {/* ── Acciones ── */}
      <div className="flex flex-col gap-2">
        <button onClick={download} disabled={!fresh || working || busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <Download size={16} /> Descargar
        </button>

        {imageCount > 1 && !batch && (
          <button onClick={() => { void runBatch() }} disabled={working}
            className="flex items-center justify-center gap-2 rounded-lg border border-border-subtle py-2 text-xs text-text-muted hover:border-accent/60 hover:text-text-primary disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <Archive size={14} /> Comprimir las {imageCount} imágenes (ZIP)
          </button>
        )}
        {batch && (
          <div className="rounded-lg border border-border-subtle p-3 text-xs">
            <div className="mb-2 flex items-center justify-between text-text-muted">
              <span className="tabular-nums">Comprimiendo {Math.min(batch.done + 1, batch.total)} de {batch.total}…</span>
              <button onClick={cancelBatch} className="flex items-center gap-1 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><X size={12} /> Cancelar</button>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={batch.total} aria-valuenow={batch.done} className="h-1.5 overflow-hidden rounded-full bg-bg-base">
              <div className="h-full bg-accent transition-all" style={{ width: `${(batch.done / batch.total) * 100}%` }} />
            </div>
          </div>
        )}
        {imageCount > 1 && !batch && (
          <p className="text-[11px] leading-snug text-text-muted">El lote aplica estos ajustes y el pipeline de cada imagen. "Mismo que el original" respeta el formato de cada una.</p>
        )}
      </div>
    </div>
  )
}
